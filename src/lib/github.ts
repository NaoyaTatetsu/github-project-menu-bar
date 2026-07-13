import { ClientError, GraphQLClient, gql } from "graphql-request";
import type {
  BoardCard,
  BoardData,
  ProjectSummary,
  SortSpec,
} from "../types";

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
              color
            }
          }
        }
        views(first: 10) {
          nodes {
            layout
            sortByFields(first: 10) {
              nodes {
                direction
                field {
                  __typename
                  ... on ProjectV2FieldCommon {
                    name
                    dataType
                  }
                  ... on ProjectV2SingleSelectField {
                    options {
                      id
                    }
                  }
                }
              }
            }
          }
        }
        items(first: 100) {
          nodes {
            id
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
            fieldValues(first: 30) {
              nodes {
                __typename
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldNumberValue {
                  number
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldSingleSelectValue {
                  optionId
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldIterationValue {
                  startDate
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface RawFieldValue {
  __typename: string;
  text?: string;
  number?: number;
  date?: string;
  optionId?: string;
  startDate?: string;
  field?: { name?: string };
}

interface RawSortByField {
  direction: "ASC" | "DESC";
  field: {
    __typename: string;
    name?: string;
    dataType?: string;
    options?: { id: string }[];
  } | null;
}

interface RawBoard {
  node: {
    title: string;
    field: {
      id: string;
      options: { id: string; name: string; color: string }[];
    } | null;
    views: {
      nodes: {
        layout: string;
        sortByFields: { nodes: RawSortByField[] };
      }[];
    };
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
        fieldValues: { nodes: RawFieldValue[] };
      }[];
    };
  } | null;
}

/** Pull one comparable value out of a project field value node. */
function fieldValueOf(v: RawFieldValue): string | number | null {
  switch (v.__typename) {
    case "ProjectV2ItemFieldTextValue":
      return v.text ?? null;
    case "ProjectV2ItemFieldNumberValue":
      return v.number ?? null;
    case "ProjectV2ItemFieldDateValue":
      return v.date ?? null;
    case "ProjectV2ItemFieldSingleSelectValue":
      return v.optionId ?? null;
    case "ProjectV2ItemFieldIterationValue":
      return v.startDate ?? null;
    default:
      return null;
  }
}

function sortKey(card: BoardCard, spec: SortSpec): string | number | null {
  // TITLE is not a project field value; use the card title we already have.
  if (spec.dataType === "TITLE") return card.title;
  return card.sortValues[spec.fieldName] ?? null;
}

function compareBy(
  a: string | number | null,
  b: string | number | null,
  spec: SortSpec
): number {
  // empty values always sort last, regardless of direction
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  let cmp: number;
  if (spec.dataType === "SINGLE_SELECT" && spec.optionOrder) {
    // order by the option's configured position, not alphabetically
    cmp =
      spec.optionOrder.indexOf(a as string) -
      spec.optionOrder.indexOf(b as string);
  } else if (spec.dataType === "NUMBER") {
    cmp = (a as number) - (b as number);
  } else {
    // DATE / ITERATION are ISO strings that sort lexically; TEXT/TITLE too
    cmp = String(a).localeCompare(String(b));
  }
  return spec.direction === "DESC" ? -cmp : cmp;
}

function sortCards(cards: BoardCard[], sortBy: SortSpec[]): BoardCard[] {
  if (sortBy.length === 0) return cards;
  // stable sort with a multi-level comparator
  return [...cards].sort((a, b) => {
    for (const spec of sortBy) {
      const c = compareBy(sortKey(a, spec), sortKey(b, spec), spec);
      if (c !== 0) return c;
    }
    return 0;
  });
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

  // read the sort config from the board view (fall back to the first view)
  const views = node.views?.nodes ?? [];
  const view =
    views.find((v) => v.layout === "BOARD_LAYOUT") ?? views[0] ?? null;
  const sortBy: SortSpec[] = (view?.sortByFields.nodes ?? [])
    .filter((s) => s.field?.name && s.field?.dataType)
    .map((s) => ({
      fieldName: s.field!.name!,
      direction: s.direction,
      dataType: s.field!.dataType!,
      optionOrder: s.field!.options?.map((o) => o.id),
    }));

  // map each Status option id to its color, for the card indicator
  const colorByOption = new Map<string, string>();
  for (const o of node.field?.options ?? []) colorByOption.set(o.id, o.color);

  const cards: BoardCard[] = node.items.nodes.map((item) => {
    const c = item.content;
    const kind = (c?.__typename as BoardCard["kind"]) ?? "Unknown";

    const sortValues: Record<string, string | number | null> = {};
    for (const v of item.fieldValues?.nodes ?? []) {
      if (v.field?.name) sortValues[v.field.name] = fieldValueOf(v);
    }

    const statusOptionId = item.fieldValueByName?.optionId ?? null;

    return {
      itemId: item.id,
      // content is null when the token can't read that item's repository
      title:
        c?.title ??
        "🔒 内容を取得できません（トークンにリポジトリ読み取り権限が必要）",
      number: c?.number,
      url: c?.url,
      statusOptionId,
      statusColor: statusOptionId
        ? colorByOption.get(statusOptionId) ?? null
        : null,
      kind,
      sortValues,
    };
  });

  return {
    title: node.title,
    statusFieldId: node.field?.id ?? null,
    statusOptions: node.field?.options ?? [],
    cards: sortCards(cards, sortBy),
    sortBy,
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
