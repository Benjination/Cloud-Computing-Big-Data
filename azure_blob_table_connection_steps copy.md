# Steps to Connect Azure Blob Storage and Table to Your Web Application

This guide outlines the essential steps to connect your Azure Blob Storage and Table (e.g., Azure Table Storage or Cosmos DB Table API) to your web application. It covers environment variables, IAM (Identity and Access Management), and access levels.

---

## 1. Create Azure Resources

- **Blob Storage**: Create a Storage Account with a Blob container (e.g., for images).
- **Table Storage**: Create a Table (e.g., `earthquakes`) in the same or another Storage Account, or use Cosmos DB Table API.

---

## 2. Set Up IAM (Identity and Access Management)

- **Recommended**: Use a Managed Identity for your web app (if hosted on Azure App Service, Azure Functions, etc.).
- **Assign Roles**:
  - For Blob Storage: Assign `Storage Blob Data Contributor` to the web app's managed identity.
  - For Table Storage: Assign `Storage Table Data Contributor` to the web app's managed identity.
- **Alternative**: Use a connection string with an account key (less secure, not recommended for production).

---

## 3. Configure Environment Variables

Add the following environment variables to your web app's configuration (in Azure Portal or your deployment pipeline):

- **For Blob Storage**:
  - `AZURE_STORAGE_ACCOUNT_NAME` = `<your-storage-account-name>`
  - `AZURE_BLOB_CONTAINER_NAME` = `<your-blob-container-name>`
  - If using connection string: `AZURE_STORAGE_CONNECTION_STRING` = `<your-connection-string>`

- **For Table Storage**:
  - `AZURE_TABLE_NAME` = `earthquakes`
  - If using connection string: `AZURE_TABLE_CONNECTION_STRING` = `<your-connection-string>`

- **If using Managed Identity**:
  - No secrets needed. Your app will authenticate using its identity.

---

## 4. Update Application Code

- Use Azure SDKs (e.g., `azure-storage-blob`, `azure-data-tables` for Python) to connect to Blob and Table.
- When using Managed Identity, use `DefaultAzureCredential` or equivalent in your SDK.
- When using connection strings, read them from environment variables.

---

## 5. Test Permissions

- Deploy your app and test uploading to Blob and reading/writing to Table.
- If you get authorization errors, double-check IAM role assignments and environment variables.

---

## 6. Security Best Practices

- **Use Managed Identity** whenever possible.
- **Restrict IAM roles** to only what is needed (Contributor, not Owner).
- **Never hardcode secrets** in your codebase.

---

## References
- [Azure Storage Account Documentation](https://docs.microsoft.com/azure/storage/common/storage-account-overview)
- [Azure Managed Identities](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [Azure SDK for Python](https://docs.microsoft.com/azure/developer/python/azure-sdk-overview)

---

This checklist will help you securely connect your Azure Blob and Table resources to your web application.
