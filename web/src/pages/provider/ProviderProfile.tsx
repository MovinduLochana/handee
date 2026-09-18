import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Eye, CheckCircle2 } from "lucide-react";
import { providerApi } from "../../api/providers";
import { skillCategoryApi } from "../../api/skillCategories";
import SkillCategoryTag from "../../components/provider/SkillCategoryTag";
import StatusBadge from "../../components/provider/StatusBadge";
import { extractApiError } from "../../lib/api";
import "./ProviderProfile.css";

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
    queryKey: ["skillCategories"],
    queryFn: skillCategoryApi.getSkillCategories,
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
  const [serviceRadiusKm, setServiceRadiusKm] = useState(25);
  const [isAvailableForWork, setIsAvailableForWork] = useState(true);
  const [availabilityNote, setAvailabilityNote] = useState("");

  useEffect(() => {
    if (myProfile) {
      setHeadline(myProfile.headline || "");
      setBio(myProfile.bio || "");
      setDescription(myProfile.description || "");
      setYearsOfExperience(myProfile.yearsOfExperience || "");
      setLanguages(myProfile.languages || []);
      setServicesOffered(myProfile.servicesOffered || []);
      setSelectedSkillIds(new Set(myProfile.skillCategories?.map((s) => s.id) || []));
      setServiceAreaAddress(myProfile.serviceAreaDisplayName || "");
      setServiceRadiusKm(myProfile.serviceRadiusKm || 25);
      setIsAvailableForWork(myProfile.isAvailableForWork ?? true);
      setAvailabilityNote(myProfile.availabilityNote || "");
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
        skillCategoryIds: Array.from(selectedSkillIds),
        serviceAreaAddress,
        serviceRadiusKm,
        isAvailableForWork,
        availabilityNote: availabilityNote || undefined,
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
          <div className="profile-roles">
            {myProfile.headline ?? "Complete your profile headline"}
          </div>
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
            <div
              className="tag-input-container"
              style={
                !isEditing
                  ? { backgroundColor: "var(--bg-surface)", border: "1px solid transparent" }
                  : {}
              }
            >
              {languages.map((lang) => (
                <span key={lang} className="tag-input-tag">
                  {lang}
                  {isEditing && (
                    <button
                      className="tag-input-remove"
                      onClick={() => setLanguages(languages.filter((l) => l !== lang))}
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
                  placeholder="Add language (press Enter)..."
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={handleAddLang}
                />
              )}
            </div>
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

      {/* ── Skills & Services Card ── */}
      <div className="edit-card">
        <div className="edit-card-header">
          <h3 className="edit-card-title">Skills & Services</h3>
        </div>
        <div className="edit-card-body">
          <div className="wizard-field">
            <label>Skill Categories</label>
            <div className="skill-grid">
              {categories.map((cat) => (
                <SkillCategoryTag
                  key={cat.id}
                  category={cat}
                  selected={selectedSkillIds.has(cat.id)}
                  onClick={isEditing ? () => toggleSkill(cat.id) : undefined}
                />
              ))}
            </div>
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
        </div>
      </div>

      {/* ── Service Area Card ── */}
      <div className="edit-card">
        <div className="edit-card-header">
          <h3 className="edit-card-title">Service Area</h3>
        </div>
        <div className="edit-card-body">
          <div className="form-row">
            <div className="form-col" style={{ flex: 2 }}>
              <div className="wizard-field" style={{ marginBottom: 0 }}>
                <label>Base City</label>
                <input
                  type="text"
                  value={serviceAreaAddress}
                  onChange={(e) => setServiceAreaAddress(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="form-col" style={{ flex: 1 }}>
              <div className="wizard-field" style={{ marginBottom: 0 }}>
                <label>Travel Radius ({serviceRadiusKm} km)</label>
                <div className="radius-slider-container" style={{ opacity: isEditing ? 1 : 0.5 }}>
                  <input
                    type="range"
                    className="radius-slider"
                    min="5"
                    max="100"
                    step="5"
                    value={serviceRadiusKm}
                    onChange={(e) => setServiceRadiusKm(parseInt(e.target.value))}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>
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
