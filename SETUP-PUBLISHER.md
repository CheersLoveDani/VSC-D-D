# Setting Up Your Publisher Account

You're seeing the error because `"your-publisher-name"` needs to be replaced with your actual publisher ID.

## Step 1: Create a Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account or GitHub account
3. Click **"Create Publisher"**
4. Fill in the form:
   - **Name**: Your display name (e.g., "Your Name" or "Your Company")
   - **ID**: Your unique publisher identifier (e.g., "yourname" or "yourcompany")
     - This ID must be lowercase, no spaces
     - Example: `johnsmith`, `acmecorp`, `myusername`
   - **Description**: Brief description about you/your organization

5. Click **Create**

## Step 2: Get Your Publisher ID

After creating your publisher, note the **ID** you chose (the lowercase identifier, not the display name).

For example:
- If you created publisher ID: `johnsmith`
- Your display name might be: `John Smith`
- You need to use: `johnsmith` in package.json

## Step 3: Update package.json

Open [package.json](package.json) and replace line 6:

**Before:**
```json
"publisher": "your-publisher-name",
```

**After:**
```json
"publisher": "johnsmith",  // Use YOUR actual publisher ID
```

Also update line 8 with your actual name:
```json
"author": {
  "name": "John Smith"  // Your actual name
},
```

## Step 4: Create Personal Access Token

1. Go to https://dev.azure.com/
2. Click your profile picture (top right) → **Security**
3. Click **Personal access tokens**
4. Click **+ New Token**
5. Fill in:
   - **Name**: "VS Code Publishing"
   - **Organization**: All accessible organizations
   - **Expiration**: Choose duration (90 days, 1 year, or custom)
   - **Scopes**: Click "Show all scopes" and select:
     - ✅ **Marketplace** → **Manage** (this is critical!)
6. Click **Create**
7. **IMPORTANT**: Copy the token immediately - you won't see it again!

## Step 5: Login with vsce

```bash
vsce login <your-publisher-id>
```

When prompted, paste your Personal Access Token.

## Step 6: Try Publishing Again

```bash
vsce publish
```

## Common Issues

### "Publisher not found"
- Make sure you replaced `"your-publisher-name"` in package.json with your actual publisher ID
- The publisher ID must match exactly (case-sensitive for the JSON, but lowercase in reality)

### "Access Denied"
- Your Personal Access Token needs **Marketplace (Manage)** scope
- Create a new token if the scope is wrong

### "Authentication failed"
- Your token might be expired
- Create a new token and run `vsce login <your-publisher-id>` again

## Quick Check

Before publishing, verify:
- [ ] Created publisher account at marketplace.visualstudio.com
- [ ] Updated package.json with your publisher ID (line 6)
- [ ] Created Personal Access Token with Marketplace (Manage) scope
- [ ] Logged in with `vsce login <your-publisher-id>`
- [ ] Token is not expired

After completing these steps, you should be able to publish successfully!
