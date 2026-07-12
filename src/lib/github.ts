import { ClientError, GraphQLClient, gql } from "graphql-request";
import type { BoardCard, BoardData, ProjectSummary } from "../types";

const ENDPOINT = "https://api.github.com/graphql";

function client(token: string): GraphQLClient {
  return new GraphQLClient(ENDPOINT, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Confirm the token works and return the login name. */
export async function verifyToken(token: string): Promise<string> {
  const data = await client(token).request<{ viewer: { login: string } }>(gql`
    query {
      viewer {
        login
      }
    }
  `);
  return data.viewer.login;
}

const PROJECTS_QUERY = gql`
  query ($first: Int!) {
    viewer {
      projectsV2(first: $first, orderBy: { field: TITLE, direction: ASC }) {
        nodes {
          id
          title
          number
          closed
        }
      }
    }
  }
`;

export async function listProjects(token: string): Promise<ProjectSummary[]> {
  const data = await client(token).request<{
    viewer: {
      projectsV2: { nodes: (ProjectSummary & { closed: boolean })[] };
    };
  }>(PROJECTS_QUERY, { first: 30 });
  // hide closed projects
  return data.viewer.projectsV2.nodes
    .filter((p) => !p.closed)
    .map(({ id, title, number }) => ({ id, title, number }));
}

const BOARD_QUERY = gql`
  query ($id: ID!) {
    node(id: $id) {
      ... on ProjectV2 {
        title
        field(name: "Status") {
          ... on ProjectV2SingleSelectField {
            id
            options {
              id
              name
            }
          }
        }
        items(first: 100) {
          nodes {
            id
            type
            content {
              __typename
              ... on Issue {
                title
                number
                url
              }
              ... on PullRequest {
                title
                number
                url
              }
              ... on DraftIssue {
                title
              }
            }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue {
                optionId
              }
            }
          }
        }
      }
    }
  }
`;

interface RawBoard {
  node: {
    title: string;
    field: { id: string; options: { id: string; name: string }[] } | null;
    items: {
      nodes: {
        id: string;
        content:
          | {
              __typename: string;
              title?: string;
              number?: number;
              url?: string;
            }
          | null;
        fieldValueByName: { optionId: string } | null;
      }[];
    };
  } | null;
}

export async function fetchBoard(
  token: string,
  projectId: string
): Promise<BoardData> {
  let data: RawBoard;
  try {
    data = await client(token).request<RawBoard>(BOARD_QUERY, { id: projectId });
  } catch (e) {
    // A fine-grained token without read access to some item's repository makes
    // GitHub return partial data + an `errors` array; graphql-request throws on
    // that. Keep the partial data so accessible items still render.
    if (e instanceof ClientError && e.response?.data) {
      data = e.response.data as RawBoard;
    } else {
      throw e;
    }
  }

  const node = data.node;
  if (!node) throw new Error("Project not found");

  const cards: BoardCard[] = node.items.nodes.map((item) => {
    const c = item.content;
    const kind = (c?.__typename as BoardCard["kind"]) ?? "Unknown";
    return {
      itemId: item.id,
      // content is null when the token can't read that item's repository
      title:
        c?.title ??
        "🔒 内容を取得できません（トークンにリポジトリ読み取り権限が必要）",
      number: c?.number,
      url: c?.url,
      statusOptionId: item.fieldValueByName?.optionId ?? null,
      kind,
    };
  });

  return {
    title: node.title,
    statusFieldId: node.field?.id ?? null,
    statusOptions: node.field?.options ?? [],
    cards,
  };
}

const UPDATE_STATUS_MUTATION = gql`
  mutation ($project: ID!, $item: ID!, $field: ID!, $option: String!) {
    updateProjectV2ItemFieldValue(
      input: {
        projectId: $project
        itemId: $item
        fieldId: $field
        value: { singleSelectOptionId: $option }
      }
    ) {
      projectV2Item {
        id
      }
    }
  }
`;

export async function updateCardStatus(
  token: string,
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string
): Promise<void> {
  await client(token).request(UPDATE_STATUS_MUTATION, {
    project: projectId,
    item: itemId,
    field: fieldId,
    option: optionId,
  });
}

const ADD_DRAFT_MUTATION = gql`
  mutation ($project: ID!, $title: String!) {
    addProjectV2DraftIssue(input: { projectId: $project, title: $title }) {
      projectItem {
        id
      }
    }
  }
`;

/**
 * Add a task as a draft issue. If a status field + option are given, the new
 * item is moved into that column right after creation.
 */
export async function addTask(
  token: string,
  projectId: string,
  title: string,
  fieldId: string | null,
  optionId: string | null
): Promise<void> {
  const data = await client(token).request<{
    addProjectV2DraftIssue: { projectItem: { id: string } };
  }>(ADD_DRAFT_MUTATION, { project: projectId, title });

  const itemId = data.addProjectV2DraftIssue.projectItem.id;
  if (fieldId && optionId) {
    await updateCardStatus(token, projectId, itemId, fieldId, optionId);
  }
}
