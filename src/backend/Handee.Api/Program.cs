<<<<<<< Updated upstream
using Handee.Application;
using Handee.Infrastructure;
using Handee.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

=======
<<<<<<< Updated upstream
=======
using Handee.Application;
using Handee.Infrastructure;
using Microsoft.EntityFrameworkCore;

>>>>>>> Stashed changes
>>>>>>> Stashed changes
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

<<<<<<< Updated upstream
builder.Services.AddApplication();

// Database Configuration
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));

=======
<<<<<<< Updated upstream
=======
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

>>>>>>> Stashed changes
>>>>>>> Stashed changes
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
