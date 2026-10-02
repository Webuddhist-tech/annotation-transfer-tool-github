declare module "diff-match-patch" {
  export class diff_match_patch {
    Diff_Timeout: number;
    Diff_EditCost: number;
    diff_main(
      text1: string,
      text2: string,
      checklines?: boolean,
    ): Array<[number, string]>;
  }
}
