# Cloud Picture Storage System - Deployment Instructions

This Flask application is configured for Azure App Service deployment using **Azure Managed Identity** for secure authentication.

## Azure Requirements

1. **Azure Storage Account**: `storagebtn1609`
   - Blob container: `images` (for pictures)
   - Table: `people` (for CSV data)

2. **Azure App Service** with:
   - Python 3.9+ runtime
   - **System-assigned Managed Identity enabled**

## Managed Identity Setup

1. Enable System-assigned Managed Identity in your App Service
2. Grant the following permissions to the Managed Identity:
   - **Storage Blob Data Contributor** role on the storage account
   - **Storage Table Data Contributor** role on the storage account

## Environment Variables

Set in Azure App Service Configuration:
```
AZURE_STORAGE_ACCOUNT_NAME=storagebtn1609
SECRET_KEY=your-secret-key-here
```

## Deployment Files

- `app.py` - Main Flask application
- `requirements.txt` - Python dependencies
- `startup.txt` - Azure startup command
- `.deployment` - Azure deployment configuration
- `people.csv` - Sample data for testing
- Sample images: `tanzima.jpg`, `dave.jpg`, etc.

## No Secrets Required!

This application uses Azure Managed Identity, which means:
- ✅ No storage keys in code
- ✅ No connection strings to manage
- ✅ Secure automatic authentication
- ✅ Follows Azure security best practices

Same pattern as your successful BasicDatabase and SumTwo projects!

## Local Development

For local testing, install Azure CLI and run `az login` to authenticate.
The application will automatically use your Azure CLI credentials locally.
