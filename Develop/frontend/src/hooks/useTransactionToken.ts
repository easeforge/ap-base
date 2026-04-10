/**
 * Transaction Token Hook (Stub)
 * 基底平台不使用 Transaction Token 機制，此為相容性 stub
 */

export const useTransactionToken = (_funcCode?: string, _autoRequest?: boolean, _autoValidate?: boolean) => {
  return {
    txnToken: 'stub-token',
    loading: false,
    error: null,
    requestToken: async () => 'stub-token',
    tokenLoading: false,
    tokenError: null,
    remainingSeconds: 9999,
    showExtendPrompt: false,
    handleExtendResponse: (_extend: boolean) => {},
  };
};
