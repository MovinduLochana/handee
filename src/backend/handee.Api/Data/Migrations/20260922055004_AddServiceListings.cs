using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Handee.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServiceListings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    FixedPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    EstimatedDuration = table.Column<TimeSpan>(type: "interval", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceListings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServiceListings_AspNetUsers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServiceListings_ServiceCategories_ServiceCategoryId",
                        column: x => x.ServiceCategoryId,
                        principalTable: "ServiceCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceListings_ProviderId",
                table: "ServiceListings",
                column: "ProviderId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceListings_ServiceCategoryId",
                table: "ServiceListings",
                column: "ServiceCategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_ServiceListings_ServiceListingId",
                table: "Bookings",
                column: "ServiceListingId",
                principalTable: "ServiceListings",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_ServiceListings_ServiceListingId",
                table: "Bookings");
            migrationBuilder.DropTable(
                name: "ServiceListings");
        }
    }
}
