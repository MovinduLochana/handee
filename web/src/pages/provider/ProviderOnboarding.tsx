import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";
import StepIndicator from "../../components/provider/StepIndicator";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import { extractApiError } from "../../lib/api";
import LocationPicker from "../../components/provider/LocationPicker";

const LANGUAGE_OPTIONS = ["Sinhala", "English", "Tamil"];

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
    queryKey: ["serviceCategories"],
    queryFn: serviceCategoryApi.getServiceCategories,
  });

  const { data: existingListings = [] } = useQuery({
    queryKey: ["myServiceListings"],
    queryFn: serviceListingsApi.getMyServiceListings,
    retry: false,
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

  // Step 2: Skills & First Service Listing
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [firstListingId, setFirstListingId] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState("");
  const [listingCategoryId, setListingCategoryId] = useState("");
  const [listingFixedPrice, setListingFixedPrice] = useState("");
  const [listingEstimatedDuration, setListingEstimatedDuration] = useState("01:00:00");
  const [listingDescription, setListingDescription] = useState("");
  const [listingScope, setListingScope] = useState("");
  const [isSavingListing, setIsSavingListing] = useState(false);

  // Step 3: Service Area
  const [serviceAreaAddress, setServiceAreaAddress] = useState("");
  const [serviceAreaLatitude, setServiceAreaLatitude] = useState<number | null>(null);
  const [serviceAreaLongitude, setServiceAreaLongitude] = useState<number | null>(null);
  const [serviceRadiusKm, setServiceRadiusKm] = useState(25);

  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const country = "Sri Lanka";

  useEffect(() => {
    if (profile) {
      if (profile.headline) setHeadline(profile.headline);
      if (profile.bio) setBio(profile.bio);
      if (profile.description) setDescription(profile.description);
      if (profile.yearsOfExperience) setYearsOfExperience(profile.yearsOfExperience);
      if (profile.languages?.length > 0) setLanguages(profile.languages);
      if (profile.serviceCategories?.length > 0) {
        setSelectedSkillIds(new Set(profile.serviceCategories.map((s) => s.id)));
      }
      if (profile.serviceAreaDisplayName) setServiceAreaAddress(profile.serviceAreaDisplayName);
      if (profile.serviceRadiusKm) setServiceRadiusKm(profile.serviceRadiusKm);
      if (profile.serviceAreaLatitude) setServiceAreaLatitude(profile.serviceAreaLatitude);
      if (profile.serviceAreaLongitude) setServiceAreaLongitude(profile.serviceAreaLongitude);
      setAddressLine1(profile.addressLine1 || "");
      setAddressLine2(profile.addressLine2 || "");
      setCity(profile.city || "");
      setAddrState(profile.state || "");
      setPostalCode(profile.postalCode || "");
    }
  }, [profile]);

  useEffect(() => {
    if (existingListings.length > 0 && !firstListingId) {
      const first = existingListings[0];
      setFirstListingId(first.id);
      setListingTitle(first.title);
      setListingCategoryId(first.serviceCategoryId);
      setListingFixedPrice(first.fixedPrice.toString());
      setListingEstimatedDuration(first.estimatedDuration || "01:00:00");
      setListingDescription(first.description || "");
      setListingScope(first.scope || "");
    }
  }, [existingListings, firstListingId]);

  useEffect(() => {
    if (
      selectedSkillIds.size > 0 &&
      (!listingCategoryId || !selectedSkillIds.has(listingCategoryId))
    ) {
      setListingCategoryId(Array.from(selectedSkillIds)[0]);
    }
  }, [selectedSkillIds, listingCategoryId]);

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
        servicesOffered: listingTitle.trim() ? [listingTitle.trim()] : [],
        serviceCategoryIds: Array.from(selectedSkillIds),
        serviceAreaLatitude: serviceAreaLatitude !== null ? serviceAreaLatitude : undefined,
        serviceAreaLongitude: serviceAreaLongitude !== null ? serviceAreaLongitude : undefined,
        serviceRadiusKm,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: addrState || undefined,
        postalCode: postalCode || undefined,
        country: "Sri Lanka",
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
        setError("Please select at least one service category.");
        return;
      }
      if (!listingTitle.trim()) {
        setError("Please provide a title for your first service listing.");
        return;
      }
      if (
        !listingFixedPrice ||
        isNaN(parseFloat(listingFixedPrice)) ||
        parseFloat(listingFixedPrice) <= 0
      ) {
        setError("Please enter a valid fixed price in LKR for your first service listing.");
        return;
      }
      if (!listingDescription.trim()) {
        setError("Please enter a description for your first service listing.");
        return;
      }
      if (!listingScope.trim()) {
        setError("Please specify the scope of work for your first service listing.");
        return;
      }

      try {
        setIsSavingListing(true);
        const targetCategory =
          listingCategoryId && selectedSkillIds.has(listingCategoryId)
            ? listingCategoryId
            : Array.from(selectedSkillIds)[0];

        const listingPayload = {
          serviceCategoryId: targetCategory,
          title: listingTitle.trim(),
          description: listingDescription.trim(),
          scope: listingScope.trim(),
          availability: "Available",
          fixedPrice: parseFloat(listingFixedPrice),
          estimatedDuration: listingEstimatedDuration || "01:00:00",
          isActive: true,
        };

        if (firstListingId) {
          await serviceListingsApi.updateServiceListing(firstListingId, listingPayload);
        } else {
          const created = await serviceListingsApi.createServiceListing(listingPayload);
          setFirstListingId(created.id);
        }
        await queryClient.invalidateQueries({ queryKey: ["myServiceListings"] });
      } catch (err) {
        setError(extractApiError(err, "Failed to save your first service listing."));
        return;
      } finally {
        setIsSavingListing(false);
      }
    } else if (currentStep === 2) {
      if (!serviceAreaAddress) {
        setError(
          "Please define your service area by selecting an address from the drop-down, or by clicking on the map.",
        );
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
              <label>Languages (select all that apply)</label>
              <div
                style={{
                  display: "flex",
                  gap: "1.5rem",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                  padding: "0.25rem 0",
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
            </div>

            <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>Address</h3>
            <div className="wizard-field">
              <label htmlFor="addressLine1">Address Line 1</label>
              <input
                id="addressLine1"
                type="text"
                placeholder="Street address"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </div>
            <div className="wizard-field">
              <label htmlFor="addressLine2">Address Line 2</label>
              <input
                id="addressLine2"
                type="text"
                placeholder="Apt, suite, unit, etc. (optional)"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-col" style={{ flex: 1 }}>
                <div className="wizard-field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-col" style={{ flex: 1 }}>
                <div className="wizard-field">
                  <label htmlFor="state">State / Province</label>
                  <input
                    id="state"
                    type="text"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-col" style={{ flex: 1 }}>
                <div className="wizard-field">
                  <label htmlFor="postalCode">Postal Code</label>
                  <input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-col" style={{ flex: 1 }}>
                <div className="wizard-field">
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    type="text"
                    value={country}
                    disabled
                    readOnly
                    style={{
                      backgroundColor: "var(--bg-surface-elevated, #f1f5f9)",
                      color: "var(--text-muted)",
                      cursor: "not-allowed",
                      opacity: 0.8,
                    }}
                  />
                </div>
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
              <label>Service Categories (required, select at least one)</label>
              <div className="skill-grid">
                {categories.map((cat) => (
                  <ServiceCategoryTag
                    key={cat.id}
                    category={cat}
                    selected={selectedSkillIds.has(cat.id)}
                    onClick={() => toggleSkill(cat.id)}
                  />
                ))}
              </div>
            </div>

            <div className="first-listing-section animate-fade-up" style={{ marginTop: "2rem" }}>
              <div className="first-listing-header">
                <Sparkles size={20} className="text-accent" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                    Create Your First Service Listing
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    Set up a standardized, fixed-price service that customers can instantly book.
                  </p>
                </div>
              </div>

              <div
                className="first-listing-form"
                style={{
                  marginTop: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className="wizard-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="listingCategory">Category for this Service</label>
                  <select
                    id="listingCategory"
                    value={listingCategoryId}
                    onChange={(e) => setListingCategoryId(e.target.value)}
                  >
                    {categories
                      .filter((c) => selectedSkillIds.has(c.id))
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    {selectedSkillIds.size === 0 && (
                      <option value="">Please select a category above first</option>
                    )}
                  </select>
                </div>

                <div className="wizard-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="listingTitle">Service Title / Name (required)</label>
                  <input
                    id="listingTitle"
                    type="text"
                    placeholder="e.g. Standard Plumbing Inspection & Leak Repair"
                    value={listingTitle}
                    onChange={(e) => setListingTitle(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="form-row">
                  <div className="form-col" style={{ flex: 1 }}>
                    <div className="wizard-field" style={{ marginBottom: 0 }}>
                      <label htmlFor="listingPrice">Fixed Price in LKR (required)</label>
                      <input
                        id="listingPrice"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="2500.00"
                        value={listingFixedPrice}
                        onChange={(e) => setListingFixedPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-col" style={{ flex: 1 }}>
                    <div className="wizard-field" style={{ marginBottom: 0 }}>
                      <label htmlFor="listingDuration">Estimated Time (HH:MM:SS)</label>
                      <input
                        id="listingDuration"
                        type="text"
                        placeholder="01:00:00"
                        pattern="^\d{2}:\d{2}:\d{2}$"
                        value={listingEstimatedDuration}
                        onChange={(e) => setListingEstimatedDuration(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="wizard-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="listingDescription">Description (required)</label>
                  <textarea
                    id="listingDescription"
                    rows={3}
                    placeholder="Describe what this service entails..."
                    value={listingDescription}
                    onChange={(e) => setListingDescription(e.target.value)}
                    maxLength={1000}
                    style={{ minHeight: "80px" }}
                  />
                </div>

                <div className="wizard-field" style={{ marginBottom: 0 }}>
                  <label htmlFor="listingScope">Scope of Work (required)</label>
                  <textarea
                    id="listingScope"
                    rows={2}
                    placeholder="Specify what is included and excluded (e.g., includes labor; replacement parts charged separately)..."
                    value={listingScope}
                    onChange={(e) => setListingScope(e.target.value)}
                    maxLength={500}
                    style={{ minHeight: "60px" }}
                  />
                </div>
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
              disabled={saveProfileMutation.isPending || isSavingListing}
            >
              {isSavingListing && currentStep === 1
                ? "Saving Listing..."
                : saveProfileMutation.isPending && currentStep === 2
                  ? "Saving Profile..."
                  : "Next Step"}
              {!saveProfileMutation.isPending && !isSavingListing && <ArrowRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
