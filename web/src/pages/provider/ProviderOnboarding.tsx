import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { providerApi } from "../../api/providers";
import { skillCategoryApi } from "../../api/skillCategories";
import StepIndicator from "../../components/provider/StepIndicator";
import SkillCategoryTag from "../../components/provider/SkillCategoryTag";
import { extractApiError } from "../../lib/api";
import LocationPicker from "../../components/provider/LocationPicker";
import "./ProviderOnboarding.css";

const STEPS = [
  { label: "Personal & Business" },
  { label: "Skills & Services" },
  { label: "Service Area" },
  { label: "Finish" },
];

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();



  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: providerApi.getMyProfile,
    retry: false,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["skillCategories"],
    queryFn: skillCategoryApi.getSkillCategories,
  });

  // ── Wizard State ────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Info
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [description, setDescription] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<number | "">("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [langInput, setLangInput] = useState("");

  // Step 2: Skills & Services
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [serviceInput, setServiceInput] = useState("");

  // Step 3: Service Area
  const [serviceAreaAddress, setServiceAreaAddress] = useState("");
  const [serviceAreaLatitude, setServiceAreaLatitude] = useState<number | null>(null);
  const [serviceAreaLongitude, setServiceAreaLongitude] = useState<number | null>(null);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(25);

  useEffect(() => {
    if (profile) {
      if (profile.headline) setHeadline(profile.headline);
      if (profile.bio) setBio(profile.bio);
      if (profile.description) setDescription(profile.description);
      if (profile.yearsOfExperience) setYearsOfExperience(profile.yearsOfExperience);
      if (profile.languages?.length > 0) setLanguages(profile.languages);
      if (profile.servicesOffered?.length > 0) setServicesOffered(profile.servicesOffered);
      if (profile.skillCategories?.length > 0) {
        setSelectedSkillIds(new Set(profile.skillCategories.map((s) => s.id)));
      }
      if (profile.serviceAreaDisplayName) setServiceAreaAddress(profile.serviceAreaDisplayName);
      if (profile.serviceRadiusKm) setServiceRadiusKm(profile.serviceRadiusKm);
      if (profile.serviceAreaLatitude) setServiceAreaLatitude(profile.serviceAreaLatitude);
      if (profile.serviceAreaLongitude) setServiceAreaLongitude(profile.serviceAreaLongitude);
    }
  }, [profile]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No profile loaded");
      await providerApi.updateProfile(profile.id, {
        headline,
        bio,
        description,
        yearsOfExperience: typeof yearsOfExperience === "number" ? yearsOfExperience : undefined,
        languages,
        servicesOffered,
        skillCategoryIds: Array.from(selectedSkillIds),
        serviceAreaAddress,
        serviceAreaLatitude: serviceAreaLatitude !== null ? serviceAreaLatitude : undefined,
        serviceAreaLongitude: serviceAreaLongitude !== null ? serviceAreaLongitude : undefined,
        serviceRadiusKm,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
    onError: (err) => {
      setError(extractApiError(err, "Failed to save profile."));
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────
  const nextStep = async () => {
    setError(null);

    if (currentStep === 0) {
      if (!headline || !bio || !yearsOfExperience) {
        setError("Please fill in all required fields (Headline, Bio, Experience).");
        return;
      }
    } else if (currentStep === 1) {
      if (selectedSkillIds.size === 0) {
        setError("Please select at least one skill category.");
        return;
      }
    } else if (currentStep === 2) {
      if (!serviceAreaAddress) {
        setError("Please define your service area by selecting an address from the drop-down, or by clicking on the map.");
        return;
      }

      // Advance to Finish Step, trigger profile save
      try {
        await saveProfileMutation.mutateAsync();
        setCurrentStep(3);
        return;
      } catch {
        return; // Error handled by mutation
      }
    }

    setCurrentStep((p) => Math.min(STEPS.length - 1, p + 1));
  };

  const prevStep = () => {
    setError(null);
    setCurrentStep((p) => Math.max(0, p - 1));
  };

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
    setSelectedSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  if (isProfileLoading)
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading onboarding...</div>;

  return (
    <div className="wizard-container">
      <header className="wizard-header animate-fade-up">
        <h1>Provider Onboarding</h1>
        <p>Welcome! Complete your profile to get started.</p>
      </header>

      <div className="animate-fade-up animate-delay-200">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {error && <div className="wizard-error animate-fade-up">{error}</div>}

      <div className="wizard-card" key={`step-${currentStep}`}>
        {/* ── STEP 0: Info ── */}
        {currentStep === 0 && (
          <div className="wizard-step">
            <h2>Personal & Business Information</h2>
            <p className="step-subtitle">Tell customers who you are and what you do best.</p>

            <div className="wizard-field">
              <label htmlFor="headline">Headline (required)</label>
              <input
                id="headline"
                type="text"
                placeholder="e.g. Master Plumber with 10+ years experience"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>

            <div className="wizard-field">
              <label htmlFor="experience">Years of Experience (required)</label>
              <input
                id="experience"
                type="number"
                min="0"
                placeholder="0"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || "")}
              />
            </div>

            <div className="wizard-field">
              <label htmlFor="bio">Short Bio (required)</label>
              <textarea
                id="bio"
                placeholder="A brief summary of your expertise."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ minHeight: "80px" }}
              />
            </div>

            <div className="wizard-field">
              <label htmlFor="description">Detailed Description</label>
              <textarea
                id="description"
                placeholder="Elaborate on your past work, certifications, and approach to customer service."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="wizard-field">
              <label>Languages (Press Enter to add)</label>
              <div className="tag-input-container">
                {languages.map((lang) => (
                  <span key={lang} className="tag-input-tag">
                    {lang}
                    <button
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
                  placeholder="Add language..."
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={handleAddLang}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Skills ── */}
        {currentStep === 1 && (
          <div className="wizard-step">
            <h2>Skills & Services</h2>
            <p className="step-subtitle">
              Select the broad categories you operate in, then list specific services.
            </p>

            <div className="wizard-field">
              <label>Skill Categories (required, select at least one)</label>
              <div className="skill-grid">
                {categories.map((cat) => (
                  <SkillCategoryTag
                    key={cat.id}
                    category={cat}
                    selected={selectedSkillIds.has(cat.id)}
                    onClick={() => toggleSkill(cat.id)}
                  />
                ))}
              </div>
            </div>

            <div className="wizard-field" style={{ marginTop: "2rem" }}>
              <label>Specific Services Offered (Press Enter to add)</label>
              <div className="tag-input-container">
                {servicesOffered.map((srv) => (
                  <span key={srv} className="tag-input-tag">
                    {srv}
                    <button
                      className="tag-input-remove"
                      onClick={() => setServicesOffered(servicesOffered.filter((s) => s !== srv))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tag-input-field"
                  placeholder="e.g. Toilet Repair, Pipe Fitting..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={handleAddService}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Service Area ── */}
        {currentStep === 2 && (
          <div className="wizard-step">
            <h2>Service Area</h2>
            <p className="step-subtitle">
              Where are you based, and how far are you willing to travel?
            </p>

            <LocationPicker
              lat={serviceAreaLatitude}
              lng={serviceAreaLongitude}
              address={serviceAreaAddress}
              radiusKm={serviceRadiusKm}
              isEditing={true}
              onChange={(lat, lng, addr, rkm) => {
                setServiceAreaLatitude(lat);
                setServiceAreaLongitude(lng);
                setServiceAreaAddress(addr);
                setServiceRadiusKm(rkm);
              }}
            />
          </div>
        )}

        {/* ── STEP 3: Finish ── */}
        {currentStep === 3 && (
          <div
            className="wizard-step animate-fade-up"
            style={{ textAlign: "center", padding: "2rem 1rem" }}
          >
            <div style={{ marginBottom: "1.5rem", color: "var(--accent)" }}>
              <CheckCircle2 size={56} style={{ margin: "0 auto" }} />
            </div>
            <h2>Profile Saved Successfully!</h2>
            <p
              style={{
                color: "var(--text-muted)",
                marginBottom: "3rem",
                maxWidth: "400px",
                margin: "0 auto 3rem",
              }}
            >
              Your provider profile has been created. To unlock all features and start accepting
              jobs, you must verify your identity.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <button
                className="wizard-btn wizard-btn-primary"
                onClick={() => navigate("/provider/submit-verification")}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={18} /> Verify Identity Now
              </button>

              <button
                className="wizard-btn wizard-btn-secondary"
                onClick={() => navigate("/dashboard")}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                Skip for now, go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        {currentStep < 3 && (
          <div className="wizard-nav">
            <button
              className="wizard-btn wizard-btn-secondary"
              onClick={prevStep}
              disabled={currentStep === 0 || saveProfileMutation.isPending}
            >
              <ArrowLeft size={16} /> Back
            </button>

            <button
              className="wizard-btn wizard-btn-primary"
              onClick={nextStep}
              disabled={saveProfileMutation.isPending}
            >
              {saveProfileMutation.isPending && currentStep === 2 ? "Saving..." : "Next Step"}
              {!saveProfileMutation.isPending && <ArrowRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
