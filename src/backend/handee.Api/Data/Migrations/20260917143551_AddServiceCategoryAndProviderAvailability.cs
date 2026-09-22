using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Handee.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCategoryAndProviderAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "JobRequests");

            migrationBuilder.AddColumn<Guid>(
                name: "ServiceCategoryId",
                table: "JobRequests",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "ProviderAvailabilitySlots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProviderId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    IsBooked = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProviderAvailabilitySlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProviderAvailabilitySlots_AspNetUsers_ProviderId",
                        column: x => x.ProviderId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ServiceCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PriceBandMin = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    PriceBandMax = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceCategories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobRequests_ServiceCategoryId",
                table: "JobRequests",
                column: "ServiceCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ProviderAvailabilitySlots_ProviderId_StartTime",
                table: "ProviderAvailabilitySlots",
                columns: new[] { "ProviderId", "StartTime" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceCategories_Name",
                table: "ServiceCategories",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_JobRequests_ServiceCategories_ServiceCategoryId",
                table: "JobRequests",
                column: "ServiceCategoryId",
                principalTable: "ServiceCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_JobRequests_ServiceCategories_ServiceCategoryId",
                table: "JobRequests");

            migrationBuilder.DropTable(
                name: "ProviderAvailabilitySlots");

            migrationBuilder.DropTable(
                name: "ServiceCategories");

            migrationBuilder.DropIndex(
                name: "IX_JobRequests_ServiceCategoryId",
                table: "JobRequests");

            migrationBuilder.DropColumn(
                name: "ServiceCategoryId",
                table: "JobRequests");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "JobRequests",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }
    }
}
