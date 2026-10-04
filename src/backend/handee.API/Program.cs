using System.Text;
using handee.API.Common;
using handee.API.Common.ExternalServices;
using handee.API.Data;
using handee.API.Entities;
using handee.API.Interfaces;
using handee.API.Repositories;
using handee.API.Services;
using handee.API.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using StackExchange.Redis;
using dotenv.net;

DotEnv.Load();



var builder = WebApplication.CreateBuilder(args);

// Check if cloud database is explicitly requested via config or environment variable
var useCloudDb = builder.Configuration.GetValue<bool?>("UseCloudDatabase") == true ||
                 string.Equals(Environment.GetEnvironmentVariable("USE_CLOUD_DB"), "true", StringComparison.OrdinalIgnoreCase);

var dbConnectionString = useCloudDb
    ? (builder.Configuration.GetConnectionString("CloudConnection") ?? builder.Configuration.GetConnectionString("DefaultConnection")!)
    : (builder.Configuration.GetConnectionString("LocalConnection") ?? builder.Configuration.GetConnectionString("DefaultConnection")!);

var dbInfo = ParsePostgresInfo(dbConnectionString);
var redisConn = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379";
var redisInfo = ParseRedisInfo(redisConn);
var agentUrl = builder.Configuration["AgentService:BaseUrl"] ?? "Not configured";

Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine("================================================================================");
Console.WriteLine("🚀  HANDEE ASP.NET CORE BACKEND STARTING UP");
Console.WriteLine("================================================================================");
Console.ResetColor();

Console.Write(" ⚙️  Environment     : ");
Console.ForegroundColor = ConsoleColor.Yellow;
Console.WriteLine(builder.Environment.EnvironmentName);
Console.ResetColor();

Console.Write(" 🗄️  Active Database : ");
if (dbInfo.IsCloud)
{
    Console.ForegroundColor = ConsoleColor.Magenta;
    Console.Write("[CLOUD - Neon PostgreSQL] ");
    Console.ResetColor();
    Console.WriteLine($"Host: {dbInfo.Host} | Database: {dbInfo.Database}");
}
else
{
    Console.ForegroundColor = ConsoleColor.Green;
    Console.Write("[LOCAL PostgreSQL] ");
    Console.ResetColor();
    Console.WriteLine($"Host: {dbInfo.Host}:{dbInfo.Port} | Database: {dbInfo.Database}");
}

Console.Write(" 🔴 Redis Cache     : ");
if (redisInfo.IsCloud)
{
    Console.ForegroundColor = ConsoleColor.Magenta;
    Console.WriteLine("[CLOUD Redis Labs]");
}
else
{
    Console.ForegroundColor = ConsoleColor.Green;
    Console.WriteLine($"[LOCAL Redis] {redisConn}");
}
Console.ResetColor();

Console.Write(" 🤖 AI Agent Service : ");
Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine(agentUrl);
Console.ResetColor();

Console.ForegroundColor = ConsoleColor.DarkGray;
Console.WriteLine(" 💡 Config Switch: Set 'UseCloudDatabase: true' or USE_CLOUD_DB=true for Cloud DB.");
Console.ForegroundColor = ConsoleColor.Cyan;
Console.WriteLine("================================================================================");
Console.ResetColor();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dbConnectionString));

// ── ASP.NET Identity ──────────────────────────────────────────────────────────
builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddApiEndpoints()
    .AddDefaultTokenProviders();

builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
    options.TokenLifespan = TimeSpan.FromHours(2));

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtConfig = builder.Configuration
    .GetSection(AuthOptions.SectionName)
    .Get<AuthOptions>()
    ?? throw new InvalidOperationException("Missing 'Jwt' configuration section.");

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtConfig.Issuer,
            ValidAudience = jwtConfig.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtConfig.SecretKey)),
            ClockSkew = TimeSpan.Zero
        };
        HubAuthExtensions.ConfigureHubJwtBearer(options);
    });

builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection(EmailSettings.SectionName));

// ── Redis Cache ───────────────────────────────────────────────────────────────
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.ConfigurationOptions = ParseRedisConnectionString(redisConn);
});

// ── HTTP Clients ─────────────────────────────────────────────────────────────
builder.Services.AddHttpClient("GoogleMaps");
builder.Services.AddHttpClient("AgentService", client =>
{
    var baseUrl = builder.Configuration["AgentService:BaseUrl"] ?? "https://handee-production.up.railway.app";
    client.BaseAddress = new Uri(baseUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

// ── OpenTelemetry ─────────────────────────────────────────────────────────────
builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r.AddService("handee.API"))
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddSource("handee.ProviderVerification")
        .AddSource("handee.ProviderTrust")
        .AddOtlpExporter());

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();

// Auth
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IRefreshTokenGenerator, RefreshTokenGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAgentWorkflowService, AgentWorkflowService>();
builder.Services.AddScoped<IJobRequestService, JobRequestService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IBookingExpirationService, BookingExpirationService>();
builder.Services.AddHostedService<BookingExpirationWorker>();
builder.Services.AddScoped<IServiceCategoryService, ServiceCategoryService>();
builder.Services.AddScoped<IServiceListingService, ServiceListingService>();
builder.Services.AddScoped<IProviderAvailabilityService, ProviderAvailabilityService>();
builder.Services.AddScoped<IPricingConfigService, PricingConfigService>();

// Provider Verification & Profiles
builder.Services.AddScoped<IProviderProfileRepository, ProviderProfileRepository>();
builder.Services.AddScoped<ICertificationRepository, CertificationRepository>();
builder.Services.AddScoped<IStorageService, LocalStorageService>();
builder.Services.AddScoped<IGoogleMapsService, GoogleMapsService>();
builder.Services.AddScoped<IVerificationService, VerificationService>();
builder.Services.AddScoped<IProviderProfileService, ProviderProfileService>();
builder.Services.AddScoped<IProviderTrustService, ProviderTrustService>();

// Reviews
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IReviewService, ReviewService>();

// Payments & Invoicing
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

// Real-Time Notifications & SignalR
builder.Services.AddSignalR();
builder.Services.AddScoped<IBookingNotificationService, BookingNotificationService>();

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddAuthorization();
builder.Services.AddHealthChecks();

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// CORS must be called before UseStaticFiles so that CORS headers apply to the images
app.UseCors();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = StoragePathResolver.CreateUploadsFileProvider(builder.Environment, builder.Configuration),
    RequestPath = "/uploads",
    ContentTypeProvider = StoragePathResolver.GetContentTypeProvider()
});

// Auto-apply pending migrations
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Seed roles
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    await RoleSeeder.SeedRolesAsync(roleManager);
}

// Seed default admin account
using (var scope = app.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    await AdminSeeder.SeedAdminAsync(userManager, builder.Configuration);
}

// Auto-apply pending migrations
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Seed service categories (after migrations, since it needs the table to exist)
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await ServiceCategorySeeder.SeedAsync(dbContext);
}

// if (app.Environment.IsDevelopment())
// {
//     // Seed mock data for development
//     using (var scope = app.Services.CreateScope())
//     {
//         var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
//         var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
//         await MockDataSeeder.SeedAsync(dbContext, userManager);
//         await InvoiceSeeder.SeedAsync(dbContext, userManager);
//     }
// }

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<handee.API.Hubs.BookingHub>("/hubs/booking");
app.MapHealthChecks("/health");

app.MapGet("/api/system/info", () => Results.Ok(new
{
    service = "Handee.Api",
    environment = app.Environment.EnvironmentName,
    database = new
    {
        type = dbInfo.IsCloud ? "Cloud (Neon PostgreSQL)" : "Local PostgreSQL",
        host = dbInfo.Host,
        port = dbInfo.Port,
        database = dbInfo.Database,
        isCloud = dbInfo.IsCloud
    },
    redis = new
    {
        type = redisInfo.IsCloud ? "Cloud Redis" : "Local Redis",
        endpoint = redisConn,
        isCloud = redisInfo.IsCloud
    },
    agentService = agentUrl
})).AllowAnonymous();

app.Run();
return;

static (string Host, string Database, int Port, bool IsCloud) ParsePostgresInfo(string connStr)
{
    try
    {
        var csb = new Npgsql.NpgsqlConnectionStringBuilder(connStr);
        var host = csb.Host ?? "localhost";
        var db = csb.Database ?? "HandeeDb";
        var port = csb.Port > 0 ? csb.Port : 5432;
        var isCloud = host.Contains("neon.tech", StringComparison.OrdinalIgnoreCase) ||
                      host.Contains("aws", StringComparison.OrdinalIgnoreCase) ||
                      host.Contains("azure", StringComparison.OrdinalIgnoreCase);
        return (host, db, port, isCloud);
    }
    catch
    {
        return ("unknown", "unknown", 5432, false);
    }
}

static (string Host, bool IsCloud) ParseRedisInfo(string connStr)
{
    var isCloud = connStr.Contains("redislabs.com", StringComparison.OrdinalIgnoreCase) ||
                  connStr.Contains("cloud", StringComparison.OrdinalIgnoreCase) ||
                  connStr.Contains("upstash", StringComparison.OrdinalIgnoreCase);
    return (connStr, isCloud);
}

static ConfigurationOptions ParseRedisConnectionString(string connectionString)
{
    if (Uri.TryCreate(connectionString, UriKind.Absolute, out var uri) &&
        (uri.Scheme.Equals("redis", StringComparison.OrdinalIgnoreCase) ||
         uri.Scheme.Equals("rediss", StringComparison.OrdinalIgnoreCase)))
    {
        var config = new ConfigurationOptions
        {
            EndPoints = { { uri.Host, uri.Port > 0 ? uri.Port : 6379 } },
            Ssl = uri.Scheme.Equals("rediss", StringComparison.OrdinalIgnoreCase),
            AbortOnConnectFail = false,
            ConnectTimeout = 5000,
            SyncTimeout = 5000
        };

        if (!string.IsNullOrEmpty(uri.UserInfo))
        {
            var parts = uri.UserInfo.Split(':', 2);
            if (parts.Length == 2)
            {
                if (!string.IsNullOrEmpty(parts[0]) && !parts[0].Equals("default", StringComparison.OrdinalIgnoreCase))
                {
                    config.User = parts[0];
                }
                config.Password = parts[1];
            }
            else if (parts.Length == 1)
            {
                config.Password = parts[0];
            }
        }

        return config;
    }

    try
    {
        var config = ConfigurationOptions.Parse(connectionString);
        config.AbortOnConnectFail = false;
        return config;
    }
    catch
    {
        return new ConfigurationOptions
        {
            EndPoints = { { "localhost", 6379 } },
            AbortOnConnectFail = false
        };
    }
}
