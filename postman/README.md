# ShipSmart AI API - Postman Collection

This folder contains the Postman collection and environment for testing the ShipSmart AI API.

## Structure

```
postman/
├── collections/
│   └── ShipSmart AI API.postman_collection.json  # Main API collection
├── environments/
│   └── local.postman_environment.json            # Local dev environment
└── globals/
    └── workspace.postman_globals.json            # Global variables
```

## Getting Started

1. **Import Collection**: Import `collections/ShipSmart AI API.postman_collection.json` into Postman
2. **Import Environment**: Import `environments/local.postman_environment.json`
3. **Select Environment**: Select "ShipSmart Local Development" from the environment dropdown
4. **Start the API**: Run `yarn dev` to start the API server on port 3001

## Authentication Flow

1. Run **Register** to create a test account
2. Run **Login** - the access token is automatically saved to the `accessToken` variable
3. All authenticated endpoints will use the token automatically

## Password Requirements

Passwords must meet the following policy:
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (@$!%*?&)

Example valid password: `SecurePass123!`

## Collection Variables

| Variable | Description |
|----------|-------------|
| `baseUrl` | API base URL (default: http://localhost:3001/api) |
| `accessToken` | JWT token (auto-populated on login) |
| `testEmail` | Test user email |
| `testPassword` | Test user password |
| `addressId` | Created address ID (auto-populated) |
| `credentialId` | Created credential ID (auto-populated) |
| `jobId` | Async job ID (auto-populated) |

## Test Scripts

Key requests include test scripts that:
- Validate response status codes
- Auto-save IDs and tokens to collection variables
- Verify response structure

## Rate Limits

- Login: 5 attempts per 15 minutes
- Registration: 3 attempts per 15 minutes

## Endpoints Covered

- **Health Check**: System status with DB/Redis health
- **Authentication**: Register, Login, Logout, Password reset
- **Users**: Profile management
- **Addresses**: CRUD operations for shipping addresses
- **Carriers**: List supported carriers and services
- **Carrier Credentials**: Manage encrypted API credentials
- **Rates & Shipments**: Compare rates, async job processing
- **Checks**: Generic check management
- **Logs**: API request logs and carrier stats
