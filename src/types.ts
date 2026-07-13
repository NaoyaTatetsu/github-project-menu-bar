export interface ProjectSummary {
  id: string;
  title: string;
  number: number;
}

export interface StatusOption {
  id: string;
  name: string;
  /** GitHub single-select color enum, e.g. GRAY/BLUE/GREEN/… */
  color?: string;
}

export interface BoardCard {
  itemId: string;
  title: string;
  /** issue/PR number, undefined for draft issues */
  number?: number;
  url?: string;
  /** optionId of the current Status single-select value, or null if unset */
  statusOptionId: string | null;
  /** GitHub color enum of the current status option, or null if unset */
  statusColor: string | null;
  kind: "Issue" | "PullRequest" | "DraftIssue" | "Unknown";
  /** field-name -> comparable value, used to replicate the web view's sort */
  sortValues: Record<string, string | number | null>;
}

export type SortDirection = "ASC" | "DESC";

export interface SortSpec {
  fieldName: string;
  direction: SortDirection;
  /** ProjectV2FieldType, e.g. TITLE / TEXT / NUMBER / DATE / SINGLE_SELECT / ITERATION */
  dataType: string;
  /** for SINGLE_SELECT: option ids in their configured order */
  optionOrder?: string[];
}

export interface BoardData {
  title: string;
  /** the "Status" single-select field id, needed for mutations */
  statusFieldId: string | null;
  statusOptions: StatusOption[];
  cards: BoardCard[];
  /** the board view's sort config, already applied to `cards` */
  sortBy: SortSpec[];
}
