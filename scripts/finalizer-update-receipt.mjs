export function updateReasonFromFinalizeReceipt(receipt, readJson) {
  if (receipt?.update?.reason) return receipt.update.reason;
  const fullReceipt = receipt?.evidence?.receipt;
  if (!fullReceipt) return undefined;
  return readJson(fullReceipt)?.update?.reason;
}
