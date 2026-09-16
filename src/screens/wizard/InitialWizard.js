export const STEPS = ["mobile", "customer", "device", "leadid", "commission", "idproof", "finish"];

export function initialWizard({ customerId, mobile, skipTo } = {}) {
  return {
    step: skipTo === "device" ? "device" : "mobile",
    mobile: mobile || "",
    customerId: customerId || null,
    isNewCustomer: false,
    customerDraft: { name: "", address: "" },
    idProofTypes: [], idProofFilesByType: {},
    leadId: "", deviceBrand: "", deviceModel: "", expectedPrice: "", purchasePrice: "",
    commission: "", status: "Pending", remarks: "",
    saved: false,
  };
}