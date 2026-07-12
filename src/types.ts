export interface ProjectSummary {
  id: string;
  title: string;
  number: number;
}

export interface StatusOption {
  id: string;
  name: string;
}

export interface BoardCard {
  itemId: string;
  title: string;
  /** issue/PR number, undefined for draft issues */
  number?: number;
  url?: string;
  /** optionId of the current Status single-select value, or null if unset */
  statusOptionId: string | null;
  kind: "Issue" | "PullRequest" | "DraftIssue" | "Unknown";
}

export interface BoardData {
  title: string;
  /** the "Status" single-select field id, needed for mutations */
  statusFieldId: string | null;
  statusOptions: StatusOption[];
  cards: BoardCard[];
}
