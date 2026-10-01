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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-medium text-muted-foreground animate-pulse">Loading onboarding...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-10 px-4 space-y-8 animate-fade-up">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Provider Onboarding</h1>
        <p className="text-sm text-muted-foreground">Welcome! Complete your profile to get started.</p>
      </header>

      <div>
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-border" key={`step-${currentStep}`}>
        {/* ── STEP 0: Info ── */}
        {currentStep === 0 && (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-bold" role="heading" aria-level={2}>
                Personal & Business Information
              </CardTitle>
              <CardDescription>Tell customers who you are and what you do best.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="headline">Headline (required)</Label>
                <Input
                  id="headline"
                  type="text"
                  placeholder="e.g. Master Plumber with 10+ years experience"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Years of Experience (required)</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || "")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio (required)</Label>
                <Textarea
                  id="bio"
                  placeholder="A brief summary of your expertise."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  placeholder="Elaborate on your past work, certifications, and approach to customer service."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Languages (select all that apply)</Label>
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <label
                      key={lang}
                      className="flex items-center gap-2 cursor-pointer text-sm font-medium text-foreground select-none"
                    >
                      <input
                        type="checkbox"
                        aria-label={lang}
                        checked={languages.includes(lang)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLanguages((prev) => [...prev, lang]);
                          } else {
                            setLanguages((prev) => prev.filter((l) => l !== lang));
                          }
                        }}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                      />
                      <span>{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              <h3 className="text-base font-semibold text-foreground pt-4 border-t border-border">Address</h3>
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  type="text"
                  placeholder="Street address"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  type="text"
                  placeholder="Apt, suite, unit, etc. (optional)"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State / Province</Label>
                  <Input
                    id="state"
                    type="text"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    type="text"
                    value={country}
                    disabled
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* ── STEP 1: Skills ── */}
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-bold" role="heading" aria-level={2}>
                Skills & Services
              </CardTitle>
              <CardDescription>
                Select the broad categories you operate in, then list specific services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Service Categories (required, select at least one)</Label>
                <div className="flex flex-wrap gap-2 pt-1">
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

              <div className="rounded-lg border border-border bg-muted/20 p-5 mt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Create Your First Service Listing
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Set up a standardized, fixed-price service that customers can instantly book.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="listingCategory">Category for this Service</Label>
                    <select
                      id="listingCategory"
                      value={listingCategoryId}
                      onChange={(e) => setListingCategoryId(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

                  <div className="space-y-2">
                    <Label htmlFor="listingTitle">Service Title / Name (required)</Label>
                    <Input
                      id="listingTitle"
                      type="text"
                      placeholder="e.g. Standard Plumbing Inspection & Leak Repair"
                      value={listingTitle}
                      onChange={(e) => setListingTitle(e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="listingPrice">Fixed Price in LKR (required)</Label>
                      <Input
                        id="listingPrice"
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="2500.00"
                        value={listingFixedPrice}
                        onChange={(e) => setListingFixedPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="listingDuration">Estimated Time (HH:MM:SS)</Label>
                      <Input
                        id="listingDuration"
                        type="text"
                        placeholder="01:00:00"
                        pattern="^\d{2}:\d{2}:\d{2}$"
                        value={listingEstimatedDuration}
                        onChange={(e) => setListingEstimatedDuration(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="listingDescription">Description (required)</Label>
                    <Textarea
                      id="listingDescription"
                      rows={3}
                      placeholder="Describe what this service entails..."
                      value={listingDescription}
                      onChange={(e) => setListingDescription(e.target.value)}
                      maxLength={1000}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="listingScope">Scope of Work (required)</Label>
                    <Textarea
                      id="listingScope"
                      rows={2}
                      placeholder="Specify what is included and excluded (e.g., includes labor; replacement parts charged separately)..."
                      value={listingScope}
                      onChange={(e) => setListingScope(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* ── STEP 2: Service Area ── */}
        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle className="text-xl font-bold" role="heading" aria-level={2}>
                Service Area
              </CardTitle>
              <CardDescription>
                Where are you based, and how far are you willing to travel?
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </>
        )}

        {/* ── STEP 3: Finish ── */}
        {currentStep === 3 && (
          <CardContent className="text-center py-10 px-4 space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Profile Saved Successfully!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your provider profile has been created. To unlock all features and start accepting
                jobs, you must verify your identity.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
              <Button
                onClick={() => navigate("/provider/submit-verification")}
                className="w-full gap-2"
              >
                <ShieldCheck className="h-4 w-4" /> Verify Identity Now
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full"
              >
                Skip for now, go to Dashboard
              </Button>
            </div>
          </CardContent>
        )}

        {/* ── Navigation ── */}
        {currentStep < 3 && (
          <CardFooter className="flex items-center justify-between border-t border-border pt-6 mt-2">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || saveProfileMutation.isPending}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            <Button
              onClick={nextStep}
              disabled={saveProfileMutation.isPending || isSavingListing}
              className="gap-2"
            >
              {isSavingListing && currentStep === 1
                ? "Saving Listing..."
                : saveProfileMutation.isPending && currentStep === 2
                  ? "Saving Profile..."
                  : "Next Step"}
              {!saveProfileMutation.isPending && !isSavingListing && <ArrowRight className="h-4 w-4" />}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
