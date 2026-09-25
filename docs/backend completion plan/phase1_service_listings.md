# Phase 1: Service Listings (The "Browse & Book" Path)

## Objective
Implement the `ServiceListing` entity, service, and API controller to allow Providers to publish fixed-scope, fixed-price services, and for Customers to browse and book them. This completes the second mandated booking path outlined in the project specification.

## Domain Relationships
- A `ServiceListing` belongs to a Provider (`ApplicationUser` / `ProviderProfile`).
- A `ServiceListing` corresponds to a single `ServiceCategory`.
- A [Booking](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/Booking.cs#12-51) can optionally belong to a `ServiceListing` (using the existing `ServiceListingId` foreign key on the [Booking](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/Booking.cs#12-51) entity).

## Step-by-Step Implementation Plan

### 1. Database Entity (`src/backend/handee.Api/Entities/ServiceListing.cs`)
Create the core entity:
```csharp
namespace handee.API.Entities;
public class ServiceListing
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ProviderId { get; set; }
    public Guid ServiceCategoryId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal FixedPrice { get; set; }
    public TimeSpan EstimatedDuration { get; set; }
    public bool IsActive { get; set; } = true;

    // Audit fields
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigations
    public ApplicationUser Provider { get; set; } = default!;
    public ServiceCategory Category { get; set; } = default!;
}
```

*Required Update:* Add `public ICollection<ServiceListing> ServiceListings { get; set; }` to [ApplicationUser.cs](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/ApplicationUser.cs) and `DbSet<ServiceListing> ServiceListings` to `ApplicationDbContext.cs`. Then, run EF core migrations to apply this schema change.

### 2. DTOs (`src/backend/handee.Api/DTO/ServiceListing/`)
Create the necessary DTOs:
- `CreateServiceListingDto`: `ServiceCategoryId`, `Title`, `Description`, `FixedPrice`, `EstimatedDuration`.
- `UpdateServiceListingDto`: Updates to title, description, price, duration, and active status.
- `ServiceListingResponseDto`: Full read representation.

### 3. Service Layer (`src/backend/handee.Api/Interfaces/IServiceListingService.cs` & `Services/ServiceListingService.cs`)
Implement the business logic:
- `CreateListingAsync(Guid providerId, CreateServiceListingDto dto)`
- `UpdateListingAsync(Guid listingId, Guid providerId, UpdateServiceListingDto dto)`
- `GetProviderListingsAsync(Guid providerId)`
- `SearchActiveListingsAsync(string? query, Guid? categoryId)`

### 4. API Controller (`src/backend/handee.Api/Controllers/ServiceListingController.cs`)
Expose the REST API:
- `GET /api/servicelistings` (Public/Customer search)
- `GET /api/servicelistings/{id}`
- `POST /api/servicelistings` (Authorize: Provider)
- `PUT /api/servicelistings/{id}` (Authorize: Provider)
- `DELETE /api/servicelistings/{id}` (Authorize: Provider)

## Definition of Done
- Database migrations successfully apply without breaking existing [Booking](file:///d:/SLIIT/Year%203%20Semester%201/SE3090%20-%20Software%20Engineering%20Frameworks/Assignment/handee/src/backend/handee.Api/Entities/Booking.cs#12-51) references.
- An authenticated Provider can create, update, and soft-delete their listings.
- A Customer or guest can search all active listings, optionally filtering by category.
