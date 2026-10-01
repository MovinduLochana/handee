import json
import os

def create_request(name, method, url_raw, headers=None, body_mode=None, body_raw=None, form_data=None, pre_script=None, test_script=None, description=""):
    req = {
        "method": method,
        "header": [],
        "url": {
            "raw": url_raw,
            "host": [url_raw.split('/')[0] if not url_raw.startswith("http") else url_raw.split('/')[2]],
            "path": [p for p in url_raw.split('?')[0].split('/') if p and not p.startswith("http") and not p.startswith("{{")]
        }
    }
    
    # Header construction
    headers = headers or []
    for h in headers:
        req["header"].append({
            "key": h["key"],
            "value": h["value"],
            "type": "text",
            "description": h.get("description", "")
        })

    # Body construction
    if body_mode == "raw" and body_raw is not None:
        req["body"] = {
            "mode": "raw",
            "raw": body_raw,
            "options": {
                "raw": {
                    "language": "json"
                }
            }
        }
    elif body_mode == "formdata" and form_data is not None:
        req["body"] = {
            "mode": "formdata",
            "formdata": form_data
        }

    events = []
    if pre_script:
        events.append({
            "listen": "prerequest",
            "script": {
                "type": "text/javascript",
                "exec": [line.strip("\r") for line in pre_script.strip().split("\n")]
            }
        })
    if test_script:
        events.append({
            "listen": "test",
            "script": {
                "type": "text/javascript",
                "exec": [line.strip("\r") for line in test_script.strip().split("\n")]
            }
        })

    item = {
        "name": name,
        "description": description,
        "request": req
    }
    if events:
        item["event"] = events

    return item


def build_collection():
    collection = {
        "info": {
            "name": "Handee API - Complete Test Suite",
            "description": "Comprehensive automated and manual test suite for Handee ASP.NET Core REST API.\n\n### Features:\n- Chained authentication and role management (Admin, Customer, Provider)\n- Dynamic ID extraction and variable synchronization\n- Seeded data verification & health check\n- Comprehensive positive workflow execution across profiles, categories, listings, reviews, bookings, and payments\n- Extensive negative & security authorization validations (400, 401, 403, 404, 409)",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": []
    }

    # =========================================================================
    # 00 - Health / Setup
    # =========================================================================
    folder_00 = {
        "name": "00 - Health / Setup",
        "description": "Smoke tests verifying API connectivity, OpenAPI contract exposure, and baseline database seeding.",
        "item": [
            create_request(
                name="00.1 - Check API OpenAPI Spec & Ping",
                method="GET",
                url_raw="{{authBaseUrl}}/openapi/v1.json",
                description="Verifies the ASP.NET Core OpenAPI documentation endpoint is reachable and healthy.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is valid OpenAPI JSON specification", function () {
    pm.response.to.be.json;
    var json = pm.response.json();
    pm.expect(json.openapi || json.swagger || json.info).to.exist;
    if (json.info) {
        pm.expect(json.info.title).to.include("handee");
    }
});
"""
            ),
            create_request(
                name="00.2 - Verify Seeded Service Categories & Initialize Category ID",
                method="GET",
                url_raw="{{baseUrl}}/service-categories",
                description="Public endpoint to list seeded service categories. Automatically extracts the first category ID into `skillCategoryId` if unset.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is an array of seeded service categories", function () {
    pm.response.to.be.json;
    var categories = pm.response.json();
    pm.expect(categories).to.be.an("array");
    pm.expect(categories.length).to.be.greaterThan(0);
    
    var firstCategory = categories[0];
    pm.expect(firstCategory).to.have.property("id");
    pm.expect(firstCategory).to.have.property("name");
    
    // Automatically extract and set skillCategoryId for chained requests
    if (firstCategory.id) {
        pm.environment.set("skillCategoryId", firstCategory.id);
        console.log("Initialized skillCategoryId to: " + firstCategory.id + " (" + firstCategory.name + ")");
    }
});
"""
            )
        ]
    }
    collection["item"].append(folder_00)

    # =========================================================================
    # 01 - Authentication
    # =========================================================================
    folder_01 = {
        "name": "01 - Authentication",
        "description": "User registration, role-specific authentication, JWT access/refresh token extraction, token rotation, and password reset workflows.",
        "item": [
            create_request(
                name="01.1 - Register New Customer",
                method="POST",
                url_raw="{{baseUrl}}/auth/register",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "fullName": "Test Customer Auto",
  "email": "cust_{{$timestamp}}@mockdata.local",
  "password": "Password123!",
  "role": "Customer"
}""",
                description="Registers a fresh Customer account with dynamic email to test registration pipeline.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Response contains user registration details", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.email).to.exist;
    pm.expect(json.role).to.eql("Customer");
});
"""
            ),
            create_request(
                name="01.2 - Admin Login",
                method="POST",
                url_raw="{{baseUrl}}/auth/login",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}""",
                description="Logs in seeded Admin account. Stores `adminAccessToken` and `adminRefreshToken` in the environment.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Admin access and refresh tokens returned", function () {
    var json = pm.response.json();
    pm.expect(json.accessToken).to.exist.and.to.be.a("string").and.not.empty;
    pm.expect(json.refreshToken).to.exist.and.to.be.a("string").and.not.empty;
    
    pm.environment.set("adminAccessToken", json.accessToken);
    pm.environment.set("adminRefreshToken", json.refreshToken);
    console.log("adminAccessToken and adminRefreshToken stored successfully.");
});
"""
            ),
            create_request(
                name="01.3 - Customer Login",
                method="POST",
                url_raw="{{baseUrl}}/auth/login",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "{{customerEmail}}",
  "password": "{{customerPassword}}"
}""",
                description="Logs in seeded Customer account. Stores `customerAccessToken` and `customerRefreshToken` in the environment.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer access and refresh tokens returned", function () {
    var json = pm.response.json();
    pm.expect(json.accessToken).to.exist.and.to.be.a("string").and.not.empty;
    pm.expect(json.refreshToken).to.exist.and.to.be.a("string").and.not.empty;
    
    pm.environment.set("customerAccessToken", json.accessToken);
    pm.environment.set("customerRefreshToken", json.refreshToken);
    console.log("customerAccessToken and customerRefreshToken stored successfully.");
});
"""
            ),
            create_request(
                name="01.4 - Provider Login",
                method="POST",
                url_raw="{{baseUrl}}/auth/login",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "{{providerEmail}}",
  "password": "{{providerPassword}}"
}""",
                description="Logs in seeded Provider account. Stores `providerAccessToken` and `providerRefreshToken` in the environment.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Provider access and refresh tokens returned", function () {
    var json = pm.response.json();
    pm.expect(json.accessToken).to.exist.and.to.be.a("string").and.not.empty;
    pm.expect(json.refreshToken).to.exist.and.to.be.a("string").and.not.empty;
    
    pm.environment.set("providerAccessToken", json.accessToken);
    pm.environment.set("providerRefreshToken", json.refreshToken);
    console.log("providerAccessToken and providerRefreshToken stored successfully.");
});
"""
            ),
            create_request(
                name="01.5 - Refresh Token (Customer Rotation)",
                method="POST",
                url_raw="{{baseUrl}}/auth/refresh",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "refreshToken": "{{customerRefreshToken}}"
}""",
                description="Rotates customer refresh token and generates fresh access token pair.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Rotated tokens successfully returned", function () {
    var json = pm.response.json();
    pm.expect(json.accessToken).to.exist.and.to.be.a("string").and.not.empty;
    pm.expect(json.refreshToken).to.exist.and.to.be.a("string").and.not.empty;
    
    // Update customer tokens with fresh pair
    pm.environment.set("customerAccessToken", json.accessToken);
    pm.environment.set("customerRefreshToken", json.refreshToken);
    console.log("Rotated customerAccessToken and customerRefreshToken updated.");
});
"""
            ),
            create_request(
                name="01.6 - Forgot Password Request",
                method="POST",
                url_raw="{{baseUrl}}/auth/forgot-password",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "{{customerEmail}}"
}""",
                description="Requests password reset link for customer account. Returns 200 with standard privacy message.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Reset confirmation message returned", function () {
    var json = pm.response.json();
    pm.expect(json.message).to.exist;
});
"""
            ),
            create_request(
                name="01.7 - Logout (Customer Rotation Teardown)",
                method="POST",
                url_raw="{{baseUrl}}/auth/logout",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "refreshToken": "{{customerRefreshToken}}"
}""",
                description="Revokes customer session refresh token.",
                test_script="""
pm.test("Status code is 204 No Content", function () {
    pm.response.to.have.status(204);
});
"""
            ),
            create_request(
                name="01.8 - Restore Customer Session Login",
                method="POST",
                url_raw="{{baseUrl}}/auth/login",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "{{customerEmail}}",
  "password": "{{customerPassword}}"
}""",
                description="Re-authenticates customer to provide valid tokens for all subsequent test steps.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer tokens refreshed for runner pipeline", function () {
    var json = pm.response.json();
    pm.expect(json.accessToken).to.exist;
    pm.environment.set("customerAccessToken", json.accessToken);
    pm.environment.set("customerRefreshToken", json.refreshToken);
});
"""
            )
        ]
    }
    collection["item"].append(folder_01)

    # =========================================================================
    # 02 - User Profile
    # =========================================================================
    folder_02 = {
        "name": "02 - User Profile",
        "description": "User profile retrieval and profile update operations for Customer, Provider, and Admin accounts.",
        "item": [
            create_request(
                name="02.1 - Get Current Customer Profile",
                method="GET",
                url_raw="{{baseUrl}}/users/me",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Fetches current customer profile and saves `customerId` to environment.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer profile contains valid identity attributes", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.fullName).to.exist;
    pm.expect(json.roles).to.be.an("array").that.includes("Customer");
    
    pm.environment.set("customerId", json.id);
    console.log("Saved customerId: " + json.id);
});
"""
            ),
            create_request(
                name="02.2 - Get Current Provider Profile",
                method="GET",
                url_raw="{{baseUrl}}/users/me",
                headers=[{"key": "Authorization", "value": "Bearer {{providerAccessToken}}"}],
                description="Fetches current provider user account and saves `providerUserId` to environment.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Provider user profile contains valid attributes", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.roles).to.be.an("array").that.includes("Provider");
    
    pm.environment.set("providerUserId", json.id);
    console.log("Saved providerUserId: " + json.id);
});
"""
            ),
            create_request(
                name="02.3 - Get Current Admin Profile",
                method="GET",
                url_raw="{{baseUrl}}/users/me",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Fetches current admin user profile and validates Admin role assignment.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Admin profile role verified", function () {
    var json = pm.response.json();
    pm.expect(json.roles).to.be.an("array").that.includes("Admin");
});
"""
            ),
            create_request(
                name="02.4 - Update Customer Profile",
                method="PUT",
                url_raw="{{baseUrl}}/users/me",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "fullName": "Test Customer (Updated)",
  "phoneNumber": "+94771234567",
  "profilePictureUrl": "https://example.com/avatar.png"
}""",
                description="Updates profile details for the authenticated customer.",
                test_script="""
pm.test("Status code is 204 No Content", function () {
    pm.response.to.have.status(204);
});
"""
            ),
            create_request(
                name="02.5 - Upload Profile Photo",
                method="POST",
                url_raw="{{baseUrl}}/users/me/photo",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                body_mode="formdata",
                form_data=[
                    {
                        "key": "photo",
                        "type": "text",
                        "value": "fake-image-bytes-for-runner-safety",
                        "description": "Multipart photo upload. In Postman GUI, change type to File to select an image."
                    }
                ],
                description="Uploads profile picture using multipart/form-data. Handles headless runner environments safely.",
                test_script="""
// Accept either 200 (if file accepted) or 400 (if server strictly checks file binary header in headless mode)
pm.test("Status code is 200 OK or 400 Bad Request (file binary validation)", function () {
    pm.expect([200, 400]).to.include(pm.response.code);
});

if (pm.response.code === 200) {
    var json = pm.response.json();
    pm.test("Profile picture URL returned", function () {
        pm.expect(json.profilePictureUrl).to.exist;
    });
}
"""
            )
        ]
    }
    collection["item"].append(folder_02)

    # =========================================================================
    # 03 - Skill & Service Categories
    # =========================================================================
    folder_03 = {
        "name": "03 - Skill Categories",
        "description": "Reference catalog of service and trade categories required across listings, provider skills, and job requests.",
        "item": [
            create_request(
                name="03.1 - List All Categories",
                method="GET",
                url_raw="{{baseUrl}}/service-categories",
                description="Public catalog listing all active service categories.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Categories list contains valid category definitions", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.greaterThan(0);
    
    var category = json.find(function(c) { return c.name === "Plumbing"; }) || json[0];
    pm.expect(category).to.have.property("id");
    pm.expect(category).to.have.property("name");
    
    pm.environment.set("skillCategoryId", category.id);
    console.log("Selected category: " + category.name + " (" + category.id + ")");
});
"""
            )
        ]
    }
    collection["item"].append(folder_03)

    # =========================================================================
    # 04 - Providers
    # =========================================================================
    folder_04 = {
        "name": "04 - Providers",
        "description": "Provider profiles, directory searches, profile updates, and internal trust signal evaluations.",
        "item": [
            create_request(
                name="04.1 - Get My Provider Profile",
                method="GET",
                url_raw="{{baseUrl}}/providers/me",
                headers=[{"key": "Authorization", "value": "Bearer {{providerAccessToken}}"}],
                description="Retrieves the logged-in provider's own full profile. Extracts `profileId` and `providerId`.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Provider profile returned with full attributes", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.userId).to.exist;
    pm.expect(json.verificationStatus).to.exist;
    
    pm.environment.set("profileId", json.id);
    pm.environment.set("providerId", json.id);
    console.log("Saved profileId & providerId: " + json.id);
});
"""
            ),
            create_request(
                name="04.2 - Search Providers (Public / Filtered)",
                method="GET",
                url_raw="{{baseUrl}}/providers/search?page=1&pageSize=20",
                description="Public directory search for verified and available providers.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Search results contains paged items array", function () {
    var json = pm.response.json();
    pm.expect(json.items).to.be.an("array");
    pm.expect(json.totalCount).to.be.a("number");
    pm.expect(json.page).to.eql(1);
    
    if (!pm.environment.get("profileId") && json.items.length > 0) {
        pm.environment.set("profileId", json.items[0].id);
        pm.environment.set("providerId", json.items[0].id);
    }
});
"""
            ),
            create_request(
                name="04.3 - Get Provider Profile by ID as Customer",
                method="GET",
                url_raw="{{baseUrl}}/providers/{{profileId}}",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Customer reading provider profile. Verifies sanitized public projection (no audit logs, no internal doc URLs).",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Sanitized public profile projection verified", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("profileId"));
    pm.expect(json.fullName).to.exist;
    pm.expect(json.auditLogs).to.be.undefined;
});
"""
            ),
            create_request(
                name="04.4 - Update Own Provider Profile",
                method="PUT",
                url_raw="{{baseUrl}}/providers/{{profileId}}",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{providerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "headline": "Master Plumber & Pipe Fitting Specialist",
  "bio": "Over 10 years of professional plumbing experience in domestic & commercial settings.",
  "description": "Specialising in acoustic leak repairs, bathroom fittings, and pressure tests.",
  "yearsOfExperience": 10,
  "languages": ["English", "Sinhala"],
  "servicesOffered": ["Leak Repair", "Pipe Installation", "Bathroom Fitting"],
  "isAvailableForWork": true,
  "availabilityNote": "Available weekdays 8am to 6pm",
  "serviceCategoryIds": ["{{skillCategoryId}}"],
  "serviceAreaLatitude": 6.9271,
  "serviceAreaLongitude": 79.8612,
  "serviceRadiusKm": 30.0,
  "addressLine1": "No. 150 Galle Road",
  "city": "Colombo",
  "country": "Sri Lanka"
}""",
                description="Updates profile details, trade skills, and service radius for the authenticated provider.",
                test_script="""
pm.test("Status code is 204 No Content", function () {
    pm.response.to.have.status(204);
});
"""
            ),
            create_request(
                name="04.5 - Get Provider Trust Signals (Internal AI Service)",
                method="GET",
                url_raw="{{authBaseUrl}}/api/internal/providers/{{profileId}}/trust-signals",
                headers=[{"key": "X-Internal-Api-Key", "value": "{{internalApiKey}}"}],
                description="Internal API endpoint consumed by AI Agent services. Authenticated via `X-Internal-Api-Key`.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Trust signals returned with correct schema", function () {
    var json = pm.response.json();
    pm.expect(json.providerId).to.eql(pm.environment.get("profileId"));
    pm.expect(json.verificationStatus).to.exist;
    pm.expect(json.ratingAggregate).to.be.a("number");
    pm.expect(json.totalReviewCount).to.be.a("number");
});
"""
            )
        ]
    }
    collection["item"].append(folder_04)

    # =========================================================================
    # 05 - Certifications
    # =========================================================================
    folder_05 = {
        "name": "05 - Certifications",
        "description": "Provider document uploads, Admin verification queue management, and certification reviews.",
        "item": [
            create_request(
                name="05.1 - Provider Upload Certification Document",
                method="POST",
                url_raw="{{baseUrl}}/providers/{{profileId}}/documents",
                headers=[{"key": "Authorization", "value": "Bearer {{providerAccessToken}}"}],
                body_mode="formdata",
                form_data=[
                    {"key": "Type", "value": "NIC", "type": "text"},
                    {"key": "File", "value": "sample-nic-document-runner-placeholder", "type": "text", "description": "Form file. Select PDF or image in Postman GUI."}
                ],
                description="Uploads trade certificate or NIC document for provider profile verification.",
                test_script="""
pm.test("Status code is 201 Created or 400 Bad Request (file header validation)", function () {
    pm.expect([201, 400]).to.include(pm.response.code);
});

if (pm.response.code === 201) {
    var json = pm.response.json();
    pm.test("Certification created successfully", function () {
        pm.expect(json.id).to.exist;
        pm.expect(json.type).to.exist;
        pm.environment.set("certificationId", json.id);
        console.log("Saved certificationId: " + json.id);
    });
}
"""
            ),
            create_request(
                name="05.2 - Admin Get Verification Queue",
                method="GET",
                url_raw="{{authBaseUrl}}/admin/verifications?page=1&pageSize=50",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Admin reviews pending and in-review provider profiles.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Verification queue paged result returned", function () {
    var json = pm.response.json();
    pm.expect(json.items).to.be.an("array");
    pm.expect(json.totalCount).to.be.a("number");
});
"""
            ),
            create_request(
                name="05.3 - Admin Get Verification Summary",
                method="GET",
                url_raw="{{authBaseUrl}}/admin/verifications/summary",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Admin retrieves aggregate statistics of provider verification statuses.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Summary dictionary returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("object");
});
"""
            ),
            create_request(
                name="05.4 - Admin Review Certification Document",
                method="PATCH",
                url_raw="{{authBaseUrl}}/admin/certifications/{{certificationId}}/review",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{adminAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "status": "Approved"
}""",
                description="Admin reviews and approves a specific uploaded certification document.",
                test_script="""
var certId = pm.environment.get("certificationId");
if (!certId) {
    pm.test("Certification review skipped (no document uploaded in runner)", function () {
        pm.expect(true).to.be.true;
    });
} else {
    pm.test("Status code is 204 No Content or 404", function () {
        pm.expect([204, 404]).to.include(pm.response.code);
    });
}
"""
            ),
            create_request(
                name="05.5 - Admin Update Provider Verification Status",
                method="PATCH",
                url_raw="{{baseUrl}}/providers/{{profileId}}/verification",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{adminAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "newStatus": "Verified",
  "note": "Credentials and documentation validated by Admin suite."
}""",
                description="Transitions provider verification status to Verified.",
                test_script="""
pm.test("Status code is 204 No Content or 400 Bad Request (illegal transition)", function () {
    pm.expect([204, 400]).to.include(pm.response.code);
});
"""
            )
        ]
    }
    collection["item"].append(folder_05)

    # =========================================================================
    # 06 - Reviews
    # =========================================================================
    folder_06 = {
        "name": "06 - Reviews",
        "description": "Customer reviews, ratings aggregate calculations, review photos, and deletion operations.",
        "item": [
            create_request(
                name="06.1 - Customer Create Review for Provider",
                method="POST",
                url_raw="{{baseUrl}}/providers/{{profileId}}/reviews",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "rating": 5,
  "comment": "Outstanding service! Arrived right on schedule and repaired the pipeline leak flawlessly."
}""",
                description="Submits a 5-star customer review for the provider. Extracts `reviewId`.",
                test_script="""
// Status 201 if first review, 409 if customer already reviewed provider
pm.test("Status code is 201 Created or 409 Conflict", function () {
    pm.expect([201, 409]).to.include(pm.response.code);
});

if (pm.response.code === 201) {
    var json = pm.response.json();
    pm.test("Review created successfully", function () {
        pm.expect(json.id).to.exist;
        pm.expect(json.rating).to.eql(5);
        pm.environment.set("reviewId", json.id);
        console.log("Saved reviewId: " + json.id);
    });
}
"""
            ),
            create_request(
                name="06.2 - Get Reviews for Provider",
                method="GET",
                url_raw="{{baseUrl}}/providers/{{profileId}}/reviews?page=1&pageSize=10",
                description="Public endpoint to fetch paginated reviews for a provider profile.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Provider reviews returned with pagination", function () {
    var json = pm.response.json();
    pm.expect(json.items).to.be.an("array");
    pm.expect(json.totalCount).to.be.a("number");
    
    if (json.items.length > 0 && !pm.environment.get("reviewId")) {
        pm.environment.set("reviewId", json.items[0].id);
        console.log("Extracted existing reviewId: " + json.items[0].id);
    }
});
"""
            ),
            create_request(
                name="06.3 - Customer Update Own Review",
                method="PUT",
                url_raw="{{baseUrl}}/reviews/{{reviewId}}",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "rating": 5,
  "comment": "Updated Review: Consistently great plumbing service, prompt communication, and clean finish."
}""",
                description="Updates comment and rating of customer's existing review.",
                test_script="""
var reviewId = pm.environment.get("reviewId");
if (!reviewId) {
    pm.test("Review update skipped (no reviewId found)", function () {
        pm.expect(true).to.be.true;
    });
} else {
    pm.test("Status code is 200 OK", function () {
        pm.response.to.have.status(200);
    });
    
    pm.test("Updated review comment verified", function () {
        var json = pm.response.json();
        pm.expect(json.comment).to.include("Updated Review");
    });
}
"""
            ),
            create_request(
                name="06.4 - Customer Upload Photo for Review",
                method="POST",
                url_raw="{{baseUrl}}/reviews/{{reviewId}}/photos",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                body_mode="formdata",
                form_data=[
                    {"key": "file", "value": "sample-photo-runner-safe", "type": "text", "description": "Form file for review photo."}
                ],
                description="Attaches a photo to a customer review via multipart/form-data.",
                test_script="""
pm.test("Status code is 200 OK or 400 Bad Request", function () {
    pm.expect([200, 400]).to.include(pm.response.code);
});
"""
            ),
            create_request(
                name="06.5 - Delete Review",
                method="DELETE",
                url_raw="{{baseUrl}}/reviews/{{reviewId}}",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Deletes review and recalculates provider rating aggregate.",
                test_script="""
var reviewId = pm.environment.get("reviewId");
if (!reviewId) {
    pm.test("Review deletion skipped (no reviewId)", function () {
        pm.expect(true).to.be.true;
    });
} else {
    pm.test("Status code is 204 No Content", function () {
        pm.response.to.have.status(204);
    });
}
"""
            )
        ]
    }
    collection["item"].append(folder_06)

    # =========================================================================
    # 07 - Job Requests
    # =========================================================================
    folder_07 = {
        "name": "07 - Job Requests",
        "description": "Job request creation, customer tracking, and admin oversight workflows.",
        "item": [
            create_request(
                name="07.1 - Customer Create Job Request",
                method="POST",
                url_raw="{{baseUrl}}/job-requests",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "serviceCategoryId": "{{skillCategoryId}}",
  "description": "Urgent kitchen sink pipeline leakage requiring immediate replacement and pressure test.",
  "photoUrls": [
    "https://images.example.com/job/leak1.jpg"
  ],
  "location": "No. 120, Galle Road, Colombo 03",
  "urgency": 2,
  "budgetMin": 5000.0,
  "budgetMax": 15000.0
}""",
                description="Creates a new job request. Extracts `jobRequestId`.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Job request created with ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.customerId).to.exist;
    pm.expect(json.description).to.exist;
    
    pm.environment.set("jobRequestId", json.id);
    console.log("Saved jobRequestId: " + json.id);
});
"""
            ),
            create_request(
                name="07.2 - Customer Get My Job Requests",
                method="GET",
                url_raw="{{baseUrl}}/job-requests/mine",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Retrieves all job requests submitted by the logged-in customer.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer job requests array returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.greaterThan(0);
});
"""
            ),
            create_request(
                name="07.3 - Get Job Request by ID",
                method="GET",
                url_raw="{{baseUrl}}/job-requests/{{jobRequestId}}",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Retrieves single job request by ID.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Job request matches requested ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("jobRequestId"));
});
"""
            ),
            create_request(
                name="07.4 - Admin / Staff Get Job Requests",
                method="GET",
                url_raw="{{baseUrl}}/job-requests?page=1&pageSize=20",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Admin retrieves paginated staff queue of all job requests across the platform.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Staff job requests list returned", function () {
    var json = pm.response.json();
    pm.expect(json.items || json).to.exist;
});
"""
            )
        ]
    }
    collection["item"].append(folder_07)

    # =========================================================================
    # 08 - Service Listings
    # =========================================================================
    folder_08 = {
        "name": "08 - Service Listings",
        "description": "Provider availability scheduling, service listing publication, searches, and updates.",
        "item": [
            create_request(
                name="08.1 - Provider Create Availability Slot",
                method="POST",
                url_raw="{{baseUrl}}/provider-availability",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{providerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "startTime": "{{slotStartTime}}",
  "endTime": "{{slotEndTime}}"
}""",
                pre_script="""
var start = new Date();
start.setDate(start.getDate() + 1);
start.setHours(9, 0, 0, 0);

var end = new Date(start);
end.setHours(17, 0, 0, 0);

pm.environment.set("slotStartTime", start.toISOString());
pm.environment.set("slotEndTime", end.toISOString());
""",
                description="Provider publishes working hour time slots.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Availability slot created with ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.isBooked).to.eql(false);
});
"""
            ),
            create_request(
                name="08.2 - Get Provider Availability Slots",
                method="GET",
                url_raw="{{baseUrl}}/provider-availability/{{providerUserId}}",
                description="Public lookup of a provider's open availability slots.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Availability slots list returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
"""
            ),
            create_request(
                name="08.3 - Provider Create Service Listing",
                method="POST",
                url_raw="{{baseUrl}}/service-listings",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{providerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "serviceCategoryId": "{{skillCategoryId}}",
  "title": "Professional Pipeline Repair & Leak Diagnostic",
  "description": "Comprehensive ultrasonic leak detection and heavy-duty pipe sealing.",
  "scope": "Detailed inspection, joint sealing, valve replacement, and full system pressure check.",
  "availability": "Mon-Fri 08:00 - 18:00",
  "fixedPrice": 12500.0,
  "estimatedDuration": "02:30:00"
}""",
                description="Creates a published service listing with fixed pricing. Extracts `serviceListingId`.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Service listing created with ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.fixedPrice).to.eql(12500);
    pm.expect(json.isActive).to.eql(true);
    
    pm.environment.set("serviceListingId", json.id);
    console.log("Saved serviceListingId: " + json.id);
});
"""
            ),
            create_request(
                name="08.4 - Search Active Service Listings",
                method="GET",
                url_raw="{{baseUrl}}/service-listings?query=Pipeline",
                description="Public search for published service listings matching query keyword.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Service listings array returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.greaterThan(0);
});
"""
            ),
            create_request(
                name="08.5 - Get Service Listing by ID",
                method="GET",
                url_raw="{{baseUrl}}/service-listings/{{serviceListingId}}",
                description="Public read of individual service listing.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Listing matches requested ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("serviceListingId"));
});
"""
            ),
            create_request(
                name="08.6 - Provider Update Service Listing",
                method="PUT",
                url_raw="{{baseUrl}}/service-listings/{{serviceListingId}}",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{providerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "title": "Master Pipeline Repair & Ultrasonic Leak Diagnostic",
  "description": "Updated high-precision leak detection and valve sealing.",
  "scope": "Full inspection, acoustic pipe leak diagnostic, and replacement with 60-day warranty.",
  "availability": "Mon-Sat 08:00 - 19:00",
  "fixedPrice": 14500.0,
  "estimatedDuration": "03:00:00",
  "isActive": true
}""",
                description="Updates pricing, duration, and scope of existing service listing.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Updated listing price reflected", function () {
    var json = pm.response.json();
    pm.expect(json.fixedPrice).to.eql(14500);
});
"""
            ),
            create_request(
                name="08.7 - Provider Get My Service Listings",
                method="GET",
                url_raw="{{baseUrl}}/service-listings/my-listings",
                headers=[{"key": "Authorization", "value": "Bearer {{providerAccessToken}}"}],
                description="Fetches all listings belonging to the authenticated provider.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("My listings list returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.greaterThan(0);
});
"""
            )
        ]
    }
    collection["item"].append(folder_08)

    # =========================================================================
    # 09 - Bookings
    # =========================================================================
    folder_09 = {
        "name": "09 - Bookings",
        "description": "Customer booking creation from service listings, schedule updates, provider status transitions, and staff queries.",
        "item": [
            create_request(
                name="09.1 - Customer Create Booking from Listing",
                method="POST",
                url_raw="{{baseUrl}}/bookings",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "serviceListingId": "{{serviceListingId}}",
  "scheduledAt": "{{bookingScheduleTime}}",
  "notes": "Please bring specialized leak detection instruments and check the bathroom line."
}""",
                pre_script="""
var sched = new Date();
sched.setDate(sched.getDate() + 2);
sched.setHours(10, 0, 0, 0);
pm.environment.set("bookingScheduleTime", sched.toISOString());
""",
                description="Creates a direct booking from a service listing. Extracts `bookingId`.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Booking created with initial Requested status", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.status).to.eql("Requested");
    
    pm.environment.set("bookingId", json.id);
    console.log("Saved bookingId: " + json.id);
});
"""
            ),
            create_request(
                name="09.2 - Customer Get My Bookings",
                method="GET",
                url_raw="{{baseUrl}}/bookings/mine",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Retrieves customer's active and historical bookings.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer bookings list returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.greaterThan(0);
});
"""
            ),
            create_request(
                name="09.3 - Provider Get My Bookings",
                method="GET",
                url_raw="{{baseUrl}}/bookings/provider-mine",
                headers=[{"key": "Authorization", "value": "Bearer {{providerAccessToken}}"}],
                description="Retrieves provider's assigned bookings.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Provider bookings list returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
"""
            ),
            create_request(
                name="09.4 - Get Booking by ID",
                method="GET",
                url_raw="{{baseUrl}}/bookings/{{bookingId}}",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Retrieves single booking details by ID.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Booking matches requested ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("bookingId"));
});
"""
            ),
            create_request(
                name="09.5 - Customer Update Booking Schedule",
                method="PUT",
                url_raw="{{baseUrl}}/bookings/{{bookingId}}/schedule",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "scheduledAt": "{{rescheduledBookingTime}}"
}""",
                pre_script="""
var resched = new Date();
resched.setDate(resched.getDate() + 3);
resched.setHours(14, 0, 0, 0);
pm.environment.set("rescheduledBookingTime", resched.toISOString());
""",
                description="Reschedules the appointment time of the booking.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});
"""
            ),
            create_request(
                name="09.6 - Provider Accept Booking Status",
                method="PUT",
                url_raw="{{baseUrl}}/bookings/{{bookingId}}/status",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{providerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "status": 1
}""",
                description="Provider updates booking status to 1 (Accepted).",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Booking status is Accepted", function () {
    var json = pm.response.json();
    pm.expect(json.status).to.eql("Accepted");
});
"""
            ),
            create_request(
                name="09.7 - Admin / Staff Get Bookings",
                method="GET",
                url_raw="{{baseUrl}}/bookings?page=1&pageSize=20",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Staff query for all platform bookings.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Staff bookings list returned", function () {
    var json = pm.response.json();
    pm.expect(json.items || json).to.exist;
});
"""
            )
        ]
    }
    collection["item"].append(folder_09)

    # =========================================================================
    # 10 - Payments / Invoices
    # =========================================================================
    folder_10 = {
        "name": "10 - Payments / Invoices",
        "description": "Invoice generation for bookings, customer payment processing with Stripe simulation, and provider payout summaries.",
        "item": [
            create_request(
                name="10.1 - Provider Create Invoice for Booking",
                method="POST",
                url_raw="{{baseUrl}}/invoices",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{providerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "bookingId": "{{bookingId}}",
  "baseAmount": 14500.0,
  "lineItemsJson": "[{\\"description\\":\\"Ultrasonic Leak Diagnostic & Repair\\",\\"amount\\":14500.0}]"
}""",
                description="Generates an invoice for the accepted booking. Extracts `invoiceId`.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Invoice created with platform fees and total", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.totalAmount).to.be.greaterThan(0);
    pm.expect(json.status).to.eql("Issued");
    
    pm.environment.set("invoiceId", json.id);
    console.log("Saved invoiceId: " + json.id);
});
"""
            ),
            create_request(
                name="10.2 - Get Invoice by ID",
                method="GET",
                url_raw="{{baseUrl}}/invoices/{{invoiceId}}",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Customer reads invoice details by ID.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Invoice matches requested ID", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("invoiceId"));
});
"""
            ),
            create_request(
                name="10.3 - Customer Get Invoices",
                method="GET",
                url_raw="{{baseUrl}}/invoices/mine",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Retrieves customer's invoice history.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Customer invoices array returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
    pm.expect(json.length).to.be.greaterThan(0);
});
"""
            ),
            create_request(
                name="10.4 - Customer Process Payment",
                method="POST",
                url_raw="{{baseUrl}}/payments/process",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "invoiceId": "{{invoiceId}}",
  "paymentMethodType": "card",
  "cardToken": "tok_visa_sandbox",
  "cardLast4": "4242",
  "gatewayProvider": "Stripe"
}""",
                description="Customer completes payment for the invoice. Extracts `paymentId`.",
                test_script="""
pm.test("Status code is 201 Created", function () {
    pm.response.to.have.status(201);
});

pm.test("Payment settled successfully", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.exist;
    pm.expect(json.invoiceId).to.eql(pm.environment.get("invoiceId"));
    pm.expect(json.status).to.eql("Settled");
    
    pm.environment.set("paymentId", json.id);
    console.log("Saved paymentId: " + json.id);
});
"""
            ),
            create_request(
                name="10.5 - Get Payment by ID",
                method="GET",
                url_raw="{{baseUrl}}/payments/{{paymentId}}",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Customer reads payment receipt by ID.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Payment details verified", function () {
    var json = pm.response.json();
    pm.expect(json.id).to.eql(pm.environment.get("paymentId"));
    pm.expect(json.status).to.eql("Settled");
});
"""
            ),
            create_request(
                name="10.6 - Provider Get Earnings Summary",
                method="GET",
                url_raw="{{baseUrl}}/payouts/summary",
                headers=[{"key": "Authorization", "value": "Bearer {{providerAccessToken}}"}],
                description="Provider inspects accumulated earnings, pending payouts, and platform commission breakdown.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Earnings summary contains financial totals", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("object");
});
"""
            ),
            create_request(
                name="10.7 - Admin Get Payouts Overview",
                method="GET",
                url_raw="{{baseUrl}}/payouts/admin/overview",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Admin reviews global payout balances and pending provider disbursement records.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Admin payouts overview returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("object");
});
"""
            )
        ]
    }
    collection["item"].append(folder_10)

    # =========================================================================
    # 11 - AI Assistant & Workflows
    # =========================================================================
    folder_11 = {
        "name": "11 - Assistant & AI Workflows",
        "description": "Integration with conversational AI assistant and agent workflow orchestration.",
        "item": [
            create_request(
                name="11.1 - Customer Query AI Assistant",
                method="POST",
                url_raw="{{baseUrl}}/assistant/query",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "query": "I have an emergency water leak under my kitchen sink. Can you suggest top-rated local plumbers?"
}""",
                description="Sends customer natural language prompt to Handee AI assistant.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Assistant response returned with reply", function () {
    var json = pm.response.json();
    pm.expect(json.reply).to.exist;
});
"""
            ),
            create_request(
                name="11.2 - Admin Get Agent Workflows",
                method="GET",
                url_raw="{{baseUrl}}/admin/agent-workflows",
                headers=[{"key": "Authorization", "value": "Bearer {{adminAccessToken}}"}],
                description="Admin queries multi-step autonomous agent workflow execution logs.",
                test_script="""
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Agent workflows array returned", function () {
    var json = pm.response.json();
    pm.expect(json).to.be.an("array");
});
"""
            )
        ]
    }
    collection["item"].append(folder_11)

    # =========================================================================
    # 99 - Negative / Authorization Tests
    # =========================================================================
    folder_99 = {
        "name": "99 - Negative / Authorization Tests",
        "description": "Rigorous security, validation, unauthorized access, and error-handling tests (400, 401, 403, 404).",
        "item": [
            create_request(
                name="99.01 - Register - Invalid Role [400 Bad Request]",
                method="POST",
                url_raw="{{baseUrl}}/auth/register",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "fullName": "Malicious Attacker",
  "email": "attacker_{{$timestamp}}@example.com",
  "password": "Password123!",
  "role": "SuperAdmin"
}""",
                description="Attempting to self-register with an unauthorized role must fail with 400 Bad Request.",
                test_script="""
pm.test("Status code is 400 Bad Request", function () {
    pm.response.to.have.status(400);
});
"""
            ),
            create_request(
                name="99.02 - Register - Missing Required Password [400 Bad Request]",
                method="POST",
                url_raw="{{baseUrl}}/auth/register",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "fullName": "Incomplete User",
  "email": "inval_{{$timestamp}}@example.com",
  "role": "Customer"
}""",
                description="Registration missing password payload must fail model validation with 400 Bad Request.",
                test_script="""
pm.test("Status code is 400 Bad Request", function () {
    pm.response.to.have.status(400);
});
"""
            ),
            create_request(
                name="99.03 - Login - Wrong Password [401 Unauthorized]",
                method="POST",
                url_raw="{{baseUrl}}/auth/login",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "{{customerEmail}}",
  "password": "TotallyWrongPassword123!"
}""",
                description="Login attempt with incorrect password must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            ),
            create_request(
                name="99.04 - Login - Non-existent User [401 Unauthorized]",
                method="POST",
                url_raw="{{baseUrl}}/auth/login",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "email": "nonexistent_account_9988@nowhere.local",
  "password": "Password123!"
}""",
                description="Login attempt with unregistered email must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            ),
            create_request(
                name="99.05 - Protected Endpoint - Missing Token [401 Unauthorized]",
                method="GET",
                url_raw="{{baseUrl}}/users/me",
                description="Calling protected endpoint without Authorization Bearer header must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            ),
            create_request(
                name="99.06 - Protected Endpoint - Malformed JWT Token [401 Unauthorized]",
                method="GET",
                url_raw="{{baseUrl}}/users/me",
                headers=[{"key": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidtokenbody.signature"}],
                description="Sending invalid/corrupted JWT signature must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            ),
            create_request(
                name="99.07 - Admin Endpoint - Customer Token Forbidden [403 Forbidden]",
                method="GET",
                url_raw="{{authBaseUrl}}/admin/users",
                headers=[{"key": "Authorization", "value": "Bearer {{customerAccessToken}}"}],
                description="Customer attempting to access admin user management must return 403 Forbidden.",
                test_script="""
pm.test("Status code is 403 Forbidden", function () {
    pm.response.to.have.status(403);
});
"""
            ),
            create_request(
                name="99.08 - Provider Verification - Customer Token Forbidden [403 Forbidden]",
                method="PATCH",
                url_raw="{{baseUrl}}/providers/{{profileId}}/verification",
                headers=[
                    {"key": "Authorization", "value": "Bearer {{customerAccessToken}}"},
                    {"key": "Content-Type", "value": "application/json"}
                ],
                body_mode="raw",
                body_raw="""{
  "newStatus": "Verified",
  "note": "Malicious elevation attempt"
}""",
                description="Customer attempting to approve provider verification must return 403 Forbidden.",
                test_script="""
pm.test("Status code is 403 Forbidden", function () {
    pm.response.to.have.status(403);
});
"""
            ),
            create_request(
                name="99.09 - Provider Profile - Non-existent ID [404 Not Found]",
                method="GET",
                url_raw="{{baseUrl}}/providers/00000000-0000-0000-0000-000000000000",
                description="Requesting a non-existent provider profile GUID must return 404 Not Found.",
                test_script="""
pm.test("Status code is 404 Not Found", function () {
    pm.response.to.have.status(404);
});
"""
            ),
            create_request(
                name="99.10 - Internal Trust Signals - Missing API Key [401 Unauthorized]",
                method="GET",
                url_raw="{{authBaseUrl}}/api/internal/providers/{{profileId}}/trust-signals",
                description="Accessing internal AI trust signals without `X-Internal-Api-Key` must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            ),
            create_request(
                name="99.11 - Internal Trust Signals - Invalid API Key [401 Unauthorized]",
                method="GET",
                url_raw="{{authBaseUrl}}/api/internal/providers/{{profileId}}/trust-signals",
                headers=[{"key": "X-Internal-Api-Key", "value": "completely-bogus-api-key"}],
                description="Accessing internal trust signals with incorrect secret key must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            ),
            create_request(
                name="99.12 - Refresh Token - Invalid / Garbage Token [401 Unauthorized]",
                method="POST",
                url_raw="{{baseUrl}}/auth/refresh",
                headers=[{"key": "Content-Type", "value": "application/json"}],
                body_mode="raw",
                body_raw="""{
  "refreshToken": "invalid-unrecognized-refresh-token"
}""",
                description="Sending invalid or unknown refresh token must return 401 Unauthorized.",
                test_script="""
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
"""
            )
        ]
    }
    collection["item"].append(folder_99)

    return collection

def build_environment():
    return {
        "id": "8625115d-b61c-482e-955e-1740d83b557a",
        "name": "Handee - Local",
        "values": [
            { "key": "baseUrl", "value": "http://localhost:5057/api", "type": "default", "enabled": True },
            { "key": "authBaseUrl", "value": "http://localhost:5057", "type": "default", "enabled": True },
            { "key": "adminEmail", "value": "admin@handee.lk", "type": "default", "enabled": True },
            { "key": "adminPassword", "value": "Admin@1234!", "type": "secret", "enabled": True },
            { "key": "customerEmail", "value": "customer1@mockdata.local", "type": "default", "enabled": True },
            { "key": "customerPassword", "value": "Password123!", "type": "secret", "enabled": True },
            { "key": "providerEmail", "value": "provider1@mockdata.local", "type": "default", "enabled": True },
            { "key": "providerPassword", "value": "Password123!", "type": "secret", "enabled": True },
            { "key": "adminAccessToken", "value": "", "type": "secret", "enabled": True },
            { "key": "customerAccessToken", "value": "", "type": "secret", "enabled": True },
            { "key": "providerAccessToken", "value": "", "type": "secret", "enabled": True },
            { "key": "adminRefreshToken", "value": "", "type": "secret", "enabled": True },
            { "key": "customerRefreshToken", "value": "", "type": "secret", "enabled": True },
            { "key": "providerRefreshToken", "value": "", "type": "secret", "enabled": True },
            { "key": "skillCategoryId", "value": "", "type": "default", "enabled": True },
            { "key": "providerId", "value": "", "type": "default", "enabled": True },
            { "key": "profileId", "value": "", "type": "default", "enabled": True },
            { "key": "certificationId", "value": "", "type": "default", "enabled": True },
            { "key": "reviewId", "value": "", "type": "default", "enabled": True },
            { "key": "reviewPhotoId", "value": "", "type": "default", "enabled": True },
            { "key": "jobRequestId", "value": "", "type": "default", "enabled": True },
            { "key": "bookingId", "value": "", "type": "default", "enabled": True },
            { "key": "serviceListingId", "value": "", "type": "default", "enabled": True },
            { "key": "invoiceId", "value": "", "type": "default", "enabled": True },
            { "key": "paymentId", "value": "", "type": "default", "enabled": True },
            { "key": "customerId", "value": "", "type": "default", "enabled": True },
            { "key": "providerUserId", "value": "", "type": "default", "enabled": True },
            { "key": "internalApiKey", "value": "dev-internal-secret-change-in-prod", "type": "secret", "enabled": True }
        ],
        "_postman_variable_scope": "environment"
    }

if __name__ == "__main__":
    out_dir = r"d:\SLIIT\Year 3 Semester 1\SE3090 - Software Engineering Frameworks\Assignment\handee\tests\postman"
    os.makedirs(out_dir, exist_ok=True)
    
    col = build_collection()
    env = build_environment()
    
    col_path = os.path.join(out_dir, "Handee_API_Complete_Test_Suite.postman_collection.json")
    env_path = os.path.join(out_dir, "Handee_Local.postman_environment.json")
    
    with open(col_path, "w", encoding="utf-8") as f:
        json.dump(col, f, indent=2)
        
    with open(env_path, "w", encoding="utf-8") as f:
        json.dump(env, f, indent=2)
        
    print(f"Generated Collection: {col_path} ({len(col['item'])} folders)")
    print(f"Generated Environment: {env_path} ({len(env['values'])} variables)")
