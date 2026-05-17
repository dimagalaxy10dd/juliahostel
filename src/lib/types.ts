export type ActionResult = { ok: boolean; error?: string };

export type ReceiptResult =
  | {
      ok: true;
      amount: number;
      note: string;
      categoryName: string;
      photoUrl: string;
    }
  | { ok: false; error: string };
