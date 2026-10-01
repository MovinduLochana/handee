import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Eye, CheckCircle2, MapPin, Home } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import StatusBadge from "../../components/provider/StatusBadge";
import { extractApiError } from "../../lib/api";
import LocationPicker from "../../components/provider/LocationPicker";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import "./ProviderProfile.css";

const LANGUAGE_OPTIONS = ["Sinhala", "English", "Tamil"];

export default function ProviderProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch user basic profile (handled by layout, but we need own data to edit)
  const { data: myProfile, isLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const { data: myServiceListings = [] } = useQuery({
    queryKey: ["myServiceListings"],
    queryFn: serviceListingsApi.getMyServiceListings,
  });

  // Form State
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [description, setDescription] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | "">("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState("");

  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");

  const [serviceAreaAddress, setServiceAreaAddress] = useState("");
  const [serviceAreaLatitude, setServiceAreaLatitude] = useState<number | null>(null);
  const [serviceAreaLongitude, setServiceAreaLongitude] = useState<number | null>(null);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(25);
  const [isAvailableForWork, setIsAvailableForWork] = useState(true);
  const [availabilityNote, setAvailabilityNote] = useState("");

  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (myProfile) {
      setHeadline(myProfile.headline || "");
      setBio(myProfile.bio || "");
      setDescription(myProfile.description || "");
      setYearsOfExperience(myProfile.yearsOfExperience || "");
      setLanguages(myProfile.languages || []);
      setServicesOffered(myProfile.servicesOffered || []);
      setSelectedSkillIds(new Set(myProfile.serviceCategories?.map((s) => s.id) || []));
      setServiceAreaAddress(myProfile.serviceAreaDisplayName || "");
      setServiceRadiusKm(myProfile.serviceRadiusKm || 25);
      setServiceAreaLatitude(myProfile.serviceAreaLatitude ?? null);
      setServiceAreaLongitude(myProfile.serviceAreaLongitude ?? null);
      setIsAvailableForWork(myProfile.isAvailableForWork ?? true);
      setAvailabilityNote(myProfile.availabilityNote || "");
      setAddressLine1(myProfile.addressLine1 || "");
      setAddressLine2(myProfile.addressLine2 || "");
      setCity(myProfile.city || "");
      setAddrState(myProfile.state || "");
      setPostalCode(myProfile.postalCode || "");
      setCountry(myProfile.country || "");
    }
  }, [myProfile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!myProfile) throw new Error("No profile loaded");
      await providerApi.updateProfile(myProfile.id, {
        headline,
        bio,
        description,
        yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : undefined,
        languages,
        servicesOffered,
        serviceCategoryIds: Array.from(selectedSkillIds),
        serviceAreaLatitude: serviceAreaLatitude !== null ? serviceAreaLatitude : undefined,
        serviceAreaLongitude: serviceAreaLongitude !== null ? serviceAreaLongitude : undefined,
        serviceRadiusKm,
        isAvailableForWork,
        availabilityNote: availabilityNote || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: addrState || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
      setSaveStatus("success");
      setIsEditing(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    },
    onError: (err) => {
      setSaveStatus("error");
      setErrorMessage(extractApiError(err, "Failed to save profile."));
    },
  });

  const handleSave = () => {
    setSaveStatus("saving");
    saveMutation.mutate();
  };

  // Shared input handlers
  const handleAddLang = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = langInput.trim();
      if (val && !languages.includes(val)) setLanguages((prev) => [...prev, val]);
      setLangInput("");
    }
  };

  const handleAddService = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = serviceInput.trim();
      if (val && !servicesOffered.includes(val)) setServicesOffered((prev) => [...prev, val]);
      setServiceInput("");
    }
  };

  const toggleSkill = (id: string) => {
    if (!isEditing) return;
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading)
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading profile...</div>;

  if (!myProfile) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }} className="animate-fade-up">
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>No Profile Found</h2>
        <p style={{ color: "var(--text-muted)" }}>
          You need to complete the verification wizard before managing your profile.
        </p>
        <button
          className="wizard-btn wizard-btn-primary"
          style={{ marginTop: "1.5rem" }}
          onClick={() => navigate("/provider/verification")}
        >
          Start Setup Wizard
        </button>
      </div>
    );
  }

  return (
    <div className="profile-edit-container animate-fade-up">
      {/* ── Header ── */}
      <div className="profile-edit-header">
        <div className="profile-avatar-wrapper">
          {myProfile.profilePictureUrl ? (
            <img
              src={
                myProfile.profilePictureUrl.startsWith("http")
                  ? myProfile.profilePictureUrl
                  : `http://localhost:5057${myProfile.profilePictureUrl}`
              }
              alt="Profile"
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-fallback">
              {myProfile.fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="profile-info">
          <h1 className="profile-name">
            {myProfile.fullName}
            <StatusBadge status={myProfile.verificationStatus} size="sm" />
          </h1>
          <div
            className="profile-headline"
            style={{
              fontSize: "0.95rem",
              color: "var(--text)",
              fontWeight: 500,
              marginBottom: "0.35rem",
            }}
          >
            {myProfile.headline ?? "Complete your profile headline"}
          </div>
          {myProfile.serviceAreaDisplayName && (
            <div
              className="profile-location"
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 500,
              }}
            >
              <MapPin size={14} /> {myProfile.serviceAreaDisplayName}
            </div>
          )}
        </div>

        <div className="profile-header-actions">
          <button
            className="wizard-btn wizard-btn-secondary"
            onClick={() => navigate(`/providers/${myProfile.id}`)}
          >
            <Eye size={16} /> View Public Profile
          </button>
          {!isEditing && (
            <button className="wizard-btn wizard-btn-primary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Info Card ── */}
      <div className="edit-card">
        <div className="edit-card-header">
          <h3 className="edit-card-title">
            <User size={20} /> Personal & Business Info
          </h3>
        </div>
        <div className="edit-card-body">
          <div className="form-row">
            <div className="form-col" style={{ flex: 2 }}>
              <div className="wizard-field">
                <label>Headline</label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="form-col" style={{ flex: 1 }}>
              <div className="wizard-field">
                <label>Years of Experience</label>
                <input
                  type="number"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || "")}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>

          <div className="wizard-field">
            <label>Bio (Short description)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={!isEditing}
              style={{ minHeight: "80px" }}
            />
          </div>

          <div className="wizard-field">
            <label>Languages</label>
            {!isEditing ? (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                  padding: "0.25rem 0",
                }}
              >
                {languages.length > 0 ? (
                  languages.map((lang) => (
                    <span key={lang} className="language-pill">
                      {lang}
                    </span>
                  ))
                ) : (
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                    }}
                  >
                    No languages specified
                  </p>
                )}
              </div>
            ) : (
              <div style={{ marginTop: "0.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    flexWrap: "wrap",
                    padding: "0.25rem 0",
                    marginBottom: "0.75rem",
                  }}
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label
                      key={lang}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        color: "var(--text-h)",
                        textTransform: "none",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={languages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLanguages((prev) => [...prev, lang]);
                          } else {
                            setLanguages((prev) => prev.filter((l) => l !== lang));
                          }
                        }}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      {lang}
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <div
                    style={{
                      fontSize: "0.825rem",
                      color: "var(--text-secondary)",
                      marginBottom: "0.35rem",
                      fontWeight: 500,
                    }}
                  >
                    Other languages (optional):
                  </div>
                  <div className="tag-input-container">
                    {languages
                      .filter((lang) => !LANGUAGE_OPTIONS.includes(lang))
                      .map((lang) => (
                        <span key={lang} className="tag-input-tag">
                          {lang}
                          <button
                            type="button"
                            className="tag-input-remove"
                            onClick={() => setLanguages(languages.filter((l) => l !== lang))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    <input
                      type="text"
                      className="tag-input-field"
                      placeholder="Add another language (press Enter)..."
                      value={langInput}
                      onChange={(e) => setLangInput(e.target.value)}
                      onKeyDown={handleAddLang}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Availability Card ── */}
      <div className="edit-card">
        <div className="edit-card-body" style={{ padding: "1rem 1.5rem" }}>
          <div className="toggle-row">
            <div className="toggle-info">
              <strong>Available for Work</strong>
              <span>Let customers know if you are currently taking on new jobs.</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={isAvailableForWork}
                onChange={(e) => isEditing && setIsAvailableForWork(e.target.checked)}
                disabled={!isEditing}
              />
              <span className="slider"></span>
            </label>
          </div>

          {isEditing && !isAvailableForWork && (
            <div className="wizard-field" style={{ marginTop: "1rem", marginBottom: 0 }}>
              <label>Availability Note (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Fully booked until next month."
                value={availabilityNote}
                onChange={(e) => setAvailabilityNote(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Address Card ── */}
      <div className="edit-card">
        <div className="edit-card-header">
          <h3 className="edit-card-title">
            <Home size={20} /> Address
          </h3>
        </div>
        <div className="edit-card-body">
          <div className="wizard-field">
            <label>Address Line 1</label>
            <input
              type="text"
              placeholder="Street address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="wizard-field">
            <label>Address Line 2</label>
            <input
              type="text"
              placeholder="Apt, suite, unit, etc. (optional)"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              disabled={!isEditing}
            />
          </div>
          <div className="form-row">
            <div className="form-col" style={{ flex: 1 }}>
              <div className="wizard-field">
                <label>City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="form-col" style={{ flex: 1 }}>
              <div className="wizard-field">
                <label>State / Province</label>
                <input
                  type="text"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-col" style={{ flex: 1 }}>
              <div className="wizard-field">
                <label>Postal Code</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="form-col" style={{ flex: 1 }}>
              <div className="wizard-field">
                <label>Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Skills & Services Card ── */}
      <div className="edit-card">
        <div className="edit-card-header">
          <h3 className="edit-card-title">Skills & Services</h3>
        </div>
        <div className="edit-card-body">
          <div className="wizard-field">
            <label>Service Categories</label>
            {(!isEditing ? categories.filter((cat) => selectedSkillIds.has(cat.id)) : categories)
              .length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0.5rem 0" }}>
                No service categories selected.
              </p>
            ) : (
              <div className="skill-grid">
                {(!isEditing
                  ? categories.filter((cat) => selectedSkillIds.has(cat.id))
                  : categories
                ).map((cat) => (
                  <ServiceCategoryTag
                    key={cat.id}
                    category={cat}
                    selected={selectedSkillIds.has(cat.id)}
                    onClick={isEditing ? () => toggleSkill(cat.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="wizard-field" style={{ marginTop: "1.5rem" }}>
            <label>Specific Services Offered</label>
            <div
              className="tag-input-container"
              style={
                !isEditing
                  ? { backgroundColor: "var(--bg-surface)", border: "1px solid transparent" }
                  : {}
              }
            >
              {servicesOffered.map((srv) => (
                <span key={srv} className="tag-input-tag">
                  {srv}
                  {isEditing && (
                    <button
                      className="tag-input-remove"
                      onClick={() => setServicesOffered(servicesOffered.filter((s) => s !== srv))}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <input
                  type="text"
                  className="tag-input-field"
                  placeholder="Add service (press Enter)..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={handleAddService}
                />
              )}
            </div>
          </div>

          {/* ── Fixed-Price Services Section (Inline) ── */}
          <div className="wizard-field" style={{ marginTop: "var(--space-10)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--space-4)",
              }}
            >
              <label
                style={{ margin: 0, fontWeight: 700, fontSize: "1.125rem", color: "var(--text-h)" }}
              >
                Fixed-Price Services
              </label>
              <button
                className="wizard-btn wizard-btn-secondary"
                style={{
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.85rem",
                  transition: "background 0.2s",
                }}
                onClick={() => navigate("/provider/service-listings")}
              >
                Manage Services
              </button>
            </div>

            {myServiceListings && myServiceListings.filter((l) => l.isActive).length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "var(--space-6)",
                }}
              >
                {myServiceListings
                  .filter((l) => l.isActive)
                  .map((listing, idx) => (
                    <div
                      key={listing.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${(idx % 10) * 50}ms` }}
                    >
                      <ServiceListingCard listing={listing} />
                    </div>
                  ))}
              </div>
            ) : (
              <div
                className="empty-state"
                style={{
                  padding: "var(--space-8)",
                  background: "var(--bg-surface)",
                  border: "1px dashed var(--border-strong)",
                  borderRadius: "12px",
                }}
              >
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: 0 }}>
                  You haven't listed any fixed-price services yet. Click 'Manage Services' to create
                  one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Service Area Card ── */}
      <div className="edit-card">
        <div className="edit-card-header">
          <h3 className="edit-card-title">Service Area</h3>
        </div>
        <div className="edit-card-body">
          <LocationPicker
            lat={serviceAreaLatitude}
            lng={serviceAreaLongitude}
            address={serviceAreaAddress}
            radiusKm={serviceRadiusKm}
            isEditing={isEditing}
            onChange={(lat, lng, addr, rkm) => {
              setServiceAreaLatitude(lat);
              setServiceAreaLongitude(lng);
              setServiceAreaAddress(addr);
              setServiceRadiusKm(rkm);
            }}
          />
        </div>
      </div>

      {/* ── Save Footer ── */}
      {isEditing && (
        <div className="profile-save-footer animate-fade-up">
          <div style={{ flex: 1 }}>
            {saveStatus === "error" && (
              <span style={{ color: "var(--text-danger)", fontWeight: 600, fontSize: "0.85rem" }}>
                {errorMessage}
              </span>
            )}
            {saveStatus === "success" && (
              <span
                style={{
                  color: "var(--success)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={18} /> Changes saved successfully
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={() => {
                setIsEditing(false);
                setSaveStatus("idle");
              }}
              disabled={saveStatus === "saving"}
            >
              Cancel
            </button>
            <button
              className="wizard-btn wizard-btn-primary"
              onClick={handleSave}
              disabled={saveStatus === "saving" || saveStatus === "success"}
            >
              {saveStatus === "saving" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
