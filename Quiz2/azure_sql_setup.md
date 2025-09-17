# Azure SQL Database Setup for Earthquake Project - COST-EFFECTIVE VERSION

## 🚨 IMPORTANT: Cost-Effective Options

### Option 1: Azure SQL Database (Free Tier - RECOMMENDED)
1. Go to Azure Portal (portal.azure.com)
2. Click "Create a resource"
3. Search for "SQL Database"
4. Click "Create"

### Configuration (FREE/CHEAP):
- **Database name**: `earthquakedb`
- **Server**: Create new server
  - **Server name**: `earthquake-server-[your-initials]` (must be globally unique)
  - **Admin login**: `sqladmin`
  - **Password**: Create a strong password (save this!)
  - **Location**: **East US** or **West US 2** (usually allowed regions)
- **Compute + storage**: 
  - **Service tier**: Basic (cheapest)
  - **Compute tier**: Serverless (pay only when active)
  - **Storage**: 32 GB max
  - **Backup storage**: Locally-redundant (cheapest)

### Option 2: SQLite (FREE Alternative)
If Azure SQL is still too expensive, we can modify your app to use SQLite:
- No Azure costs
- Works locally and on Azure App Service
- Meets assignment SQL requirements
- Perfect for student projects

## 🌍 Region Selection (Fix the Policy Error):
Try these regions in order:
1. **East US** (most common for student subscriptions)
2. **West US 2**
3. **Central US**
4. **East US 2**

## 💰 Cost Control:
- **Choose Basic tier** - Around $5/month
- **Set up spending alerts** - Stop at $10/month
- **Use Serverless** - Auto-pauses when not in use
- **Delete after assignment** - Don't forget!

## 🔧 If Azure SQL is blocked/expensive:
I can help you modify the app to use SQLite instead - it's free and meets all assignment requirements!

## Step 2: Create the Database (IMPORTANT - Separate Step!)

⚠️ **You created the SERVER, now create the DATABASE:**

### Method 1: Through Azure Portal
1. Search "SQL databases" in Azure Portal
2. Click "Create SQL database"
3. **Server**: Select your existing `bniccum` server
4. **Database name**: `earthquakedb`
5. **Compute + storage**: Basic tier

### Method 2: Through Your Server
1. Go to your `bniccum` SQL server
2. Click "SQL databases" in left menu
3. Click "+ Create database"
4. Name: `earthquakedb`

## Step 3: Configure Firewall (CRITICAL!)

🚨 **IMPORTANT: Azure SQL blocks all connections by default. You MUST configure firewall:**

1. Go to Azure Portal → Your `bniccum` SQL Server (not the database)
2. Click "Networking" in the left menu
3. Under "Firewall rules":
   - ✅ **Check** "Allow Azure services and resources to access this server"
   - Click **"Add your client IPv4 address"** (adds your current IP)
   - Click **"Save"**

### If you get login errors:
- Make sure you're using **SQL Authentication** (not Azure AD)
- Username: `sqladmin` (exactly as created)
- Password: The password you set
- Server: `bniccum.database.windows.net`

## Step 4: Get Connection Information

After creation, go to your SQL Database and note:
- **Server name**: `your-server-name.database.windows.net`
- **Database name**: `earthquakedb`
- **Username**: `sqladmin`
- **Password**: (what you set)

## Step 4: Import CSV Data into Your Database

🎉 **Great! Now you have both server and database. Here's how to import your earthquake data:**

### Option 1: Azure Data Studio (RECOMMENDED - Easy GUI)
1. Download Azure Data Studio (free)
2. Connect to your database:
   - Server: `bniccum.database.windows.net`
   - Database: `earthquakedb`
   - Authentication: SQL Login
   - Username: `sqladmin`
   - Password: (your password)
3. Right-click database → "Import wizard"
4. Select your `earthquakes.csv` file
5. Map columns to create the table automatically

### Option 2: Azure Portal Query Editor
1. Go to your `earthquakedb` in Azure Portal
2. Click "Query editor" in left menu
3. Login with your SQL credentials
4. First, create the table:
```sql
CREATE TABLE earthquakes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    time DATETIME2,
    latitude FLOAT,
    longitude FLOAT,
    depth FLOAT,
    magnitude FLOAT,
    magType NVARCHAR(10),
    place NVARCHAR(500),
    type NVARCHAR(50),
    net NVARCHAR(10),
    earthquake_id NVARCHAR(100),
    updated DATETIME2
);
```
5. Then use BULK INSERT (requires uploading CSV to Azure Storage first)

### Option 3: Through Your Flask App (EASIEST)
1. Deploy your Flask app with the database connection
2. Visit `/upload-csv` endpoint
3. It will automatically read your CSV and import it

### Option 4: SQL Server Import/Export Wizard
If you have SQL Server Management Studio installed locally.

## Step 5: Update Environment Variables

You'll need to set these in your Azure App Service:
```
AZURE_SQL_SERVER=bniccum.database.windows.net
AZURE_SQL_DATABASE=earthquakedb
AZURE_SQL_USERNAME=sqladmin
AZURE_SQL_PASSWORD=your-password
```

## Step 4: Connection String Format
```
Server=tcp:bniccum.database.windows.net,1433;Initial Catalog=earthquakedb;Persist Security Info=False;User ID=sqladmin;Password=your-password;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

## Next Steps:
1. Create the database as described above
2. Get the connection details
3. Update the Flask app to use SQL Database instead of Table Storage
4. Create the earthquake table schema
5. Import CSV data

## Important Notes:
- Keep your password secure
- The server name must be globally unique
- Make sure to allow your current IP in firewall settings
- Basic tier is sufficient for this project (can upgrade later)
