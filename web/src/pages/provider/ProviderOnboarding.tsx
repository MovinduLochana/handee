import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, X } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import StepIndicator from "../../components/provider/StepIndicator";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import { extractApiError } from "../../lib/api";
import LocationPicker from "../../components/provider/LocationPicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  useEffect(() => {
    if (profile) {
      if (profile.headline) setHeadline(profile.headline);
      if (profile.bio) setBio(profile.bio);
      if (profile.description) setDescription(profile.description);
      if (profile.yearsOfExperience) setYearsOfExperience(profile.yearsOfExperience);
      if (profile.languages?.length > 0) setLanguages(profile.languages);
      if (profile.servicesOffered?.length > 0) setServicesOffered(profile.servicesOffered);
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
      setCountry(profile.country || "");
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
        serviceCategoryIds: Array.from(selectedSkillIds),
        serviceAreaLatitude: serviceAreaLatitude !== null ? serviceAreaLatitude : undefined,
        serviceAreaLongitude: serviceAreaLongitude !== null ? serviceAreaLongitude : undefined,
        serviceRadiusKm,
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

  if (isProfileLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading onboarding...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Provider Onboarding</h1>
        <p className="text-muted-foreground">Welcome! Complete your profile to get started.</p>
      </header>

      <div className="my-6">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card key={`step-${currentStep}`} className="rounded-none border-border">
        {/* ── STEP 0: Info ── */}
        {currentStep === 0 && (
          <>
            <CardHeader>
              <CardTitle>Personal & Business Information</CardTitle>
              <CardDescription>Tell customers who you are and what you do best.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  placeholder="Elaborate on your past work, certifications, and approach to customer service."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Languages (Press Enter to add)</Label>
                <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-none bg-background focus-within:ring-2 focus-within:ring-ring">
                  {languages.map((lang) => (
                    <Badge
                      key={lang}
                      variant="secondary"
                      className="flex items-center gap-1 rounded-none px-2 py-0.5"
                    >
                      {lang}
                      <button
                        type="button"
                        className="hover:text-destructive cursor-pointer"
                        onClick={() => setLanguages(languages.filter((l) => l !== lang))}
                        aria-label={`Remove ${lang}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] placeholder:text-muted-foreground focus:outline-none"
                    placeholder="Add language..."
                    value={langInput}
                    onChange={(e) => setLangInput(e.target.value)}
                    onKeyDown={handleAddLang}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Address</h3>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* ── STEP 1: Skills ── */}
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle>Skills & Services</CardTitle>
              <CardDescription>
                Select the broad categories you operate in, then list specific services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Service Categories (required, select at least one)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
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

              <div className="space-y-3 pt-4 border-t border-border">
                <Label>Specific Services Offered (Press Enter to add)</Label>
                <div className="flex flex-wrap items-center gap-2 p-2 border border-input rounded-none bg-background focus-within:ring-2 focus-within:ring-ring">
                  {servicesOffered.map((srv) => (
                    <Badge
                      key={srv}
                      variant="secondary"
                      className="flex items-center gap-1 rounded-none px-2 py-0.5"
                    >
                      {srv}
                      <button
                        type="button"
                        className="hover:text-destructive cursor-pointer"
                        onClick={() => setServicesOffered(servicesOffered.filter((s) => s !== srv))}
                        aria-label={`Remove ${srv}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type="text"
                    className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px] placeholder:text-muted-foreground focus:outline-none"
                    placeholder="e.g. Toilet Repair, Pipe Fitting..."
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={handleAddService}
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* ── STEP 2: Service Area ── */}
        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle>Service Area</CardTitle>
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
          <CardContent className="text-center py-12 px-6 space-y-6">
            <div className="flex justify-center text-primary">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Profile Saved Successfully!
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                Your provider profile has been created. To unlock all features and start accepting
                jobs, you must verify your identity.
              </p>
            </div>

            <div className="flex flex-col gap-3 items-center max-w-xs mx-auto pt-4">
              <Button
                className="w-full justify-center gap-2"
                onClick={() => navigate("/provider/submit-verification")}
              >
                <ShieldCheck className="w-4 h-4" /> Verify Identity Now
              </Button>

              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => navigate("/dashboard")}
              >
                Skip for now, go to Dashboard
              </Button>
            </div>
          </CardContent>
        )}

        {/* ── Navigation ── */}
        {currentStep < 3 && (
          <div className="flex items-center justify-between p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || saveProfileMutation.isPending}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            <Button onClick={nextStep} disabled={saveProfileMutation.isPending} className="gap-2">
              {saveProfileMutation.isPending && currentStep === 2 ? "Saving..." : "Next Step"}
              {!saveProfileMutation.isPending && <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
