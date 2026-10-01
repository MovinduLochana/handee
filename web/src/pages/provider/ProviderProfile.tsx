import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Eye, CheckCircle2, MapPin, Home, Briefcase, X } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import StatusBadge from "../../components/provider/StatusBadge";
import { extractApiError } from "../../lib/api";
import LocationPicker from "../../components/provider/LocationPicker";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="container max-w-lg mx-auto py-16 px-4">
        <Card className="text-center p-8 border-dashed shadow-sm">
          <CardContent className="space-y-4 pt-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">No Profile Found</h2>
            <p className="text-sm text-muted-foreground">
              You need to complete the verification wizard before managing your profile.
            </p>
            <Button onClick={() => navigate("/provider/verification")} className="mt-2">
              Start Setup Wizard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8 animate-fade-up pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-border shadow-xs shrink-0">
            {myProfile.profilePictureUrl ? (
              <AvatarImage
                src={
                  myProfile.profilePictureUrl.startsWith("http")
                    ? myProfile.profilePictureUrl
                    : `http://localhost:5057${myProfile.profilePictureUrl}`
                }
                alt={myProfile.fullName}
              />
            ) : null}
            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
              {myProfile.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {myProfile.fullName}
              </h1>
              <StatusBadge status={myProfile.verificationStatus} size="sm" />
            </div>
            <div className="text-sm font-medium text-foreground">
              {myProfile.headline ?? "Complete your profile headline"}
            </div>
            {myProfile.serviceAreaDisplayName && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{myProfile.serviceAreaDisplayName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate(`/providers/${myProfile.id}`)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" /> View Public Profile
          </Button>
          {!isEditing && <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>}
        </div>
      </div>

      {/* ── Info Card ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal & Business Info
          </CardTitle>
          <CardDescription>Basic information visible on your professional profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                disabled={!isEditing}
                placeholder="e.g. Master Electrician & Solar Specialist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || "")}
                disabled={!isEditing}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (Short description)</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={!isEditing}
              rows={3}
              placeholder="Tell clients about your expertise and customer service..."
            />
          </div>

          <div className="space-y-2">
            <Label>Languages</Label>
            {!isEditing ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {languages.length > 0 ? (
                  languages.map((lang) => (
                    <Badge
                      key={lang}
                      variant="secondary"
                      className="language-pill px-3 py-1 text-xs font-medium bg-muted text-muted-foreground border border-border"
                    >
                      {lang}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">No languages specified</p>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-6">
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

                <div className="space-y-2 pt-2">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Other languages (optional):
                  </span>
                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-input bg-background min-h-[42px]">
                    {languages
                      .filter((lang) => !LANGUAGE_OPTIONS.includes(lang))
                      .map((lang) => (
                        <Badge
                          key={lang}
                          variant="secondary"
                          className="gap-1 pl-2.5 pr-1 py-0.5 text-xs font-medium"
                        >
                          {lang}
                          <button
                            type="button"
                            className="h-3.5 w-3.5 rounded-full hover:bg-muted-foreground/20 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                            onClick={() => setLanguages(languages.filter((l) => l !== lang))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    <input
                      type="text"
                      className="flex-1 min-w-[140px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
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
        </CardContent>
      </Card>

      {/* ── Availability Card ── */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-foreground">Available for Work</div>
              <div className="text-xs text-muted-foreground">
                Let customers know if you are currently taking on new jobs.
              </div>
            </div>
            <Switch
              checked={isAvailableForWork}
              onCheckedChange={(checked) => isEditing && setIsAvailableForWork(checked)}
              disabled={!isEditing}
            />
          </div>

          {isEditing && !isAvailableForWork && (
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              <Label htmlFor="availabilityNote">Availability Note (Optional)</Label>
              <Input
                id="availabilityNote"
                type="text"
                placeholder="e.g. Fully booked until next month."
                value={availabilityNote}
                onChange={(e) => setAvailabilityNote(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Address Card ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" /> Address
          </CardTitle>
          <CardDescription>
            Your registered physical business or home base location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input
              id="addressLine1"
              type="text"
              placeholder="Street address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              disabled={!isEditing}
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
              disabled={!isEditing}
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
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addrState">State / Province</Label>
              <Input
                id="addrState"
                type="text"
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                disabled={!isEditing}
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
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Skills & Services Card ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Skills & Services
          </CardTitle>
          <CardDescription>
            Select service categories and specific skills you offer to customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Service Categories</Label>
            {(!isEditing ? categories.filter((cat) => selectedSkillIds.has(cat.id)) : categories)
              .length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 italic">
                No service categories selected.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
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

          <div className="space-y-3 pt-2">
            <Label>Specific Services Offered</Label>
            <div
              className={`flex flex-wrap items-center gap-2 p-2.5 rounded-md min-h-[42px] border ${
                isEditing ? "border-input bg-background" : "border-border bg-muted/30"
              }`}
            >
              {servicesOffered.map((srv) => (
                <Badge
                  key={srv}
                  variant="secondary"
                  className="gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium"
                >
                  {srv}
                  {isEditing && (
                    <button
                      type="button"
                      className="h-3.5 w-3.5 rounded-full hover:bg-muted-foreground/20 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setServicesOffered(servicesOffered.filter((s) => s !== srv))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
              {isEditing && (
                <input
                  type="text"
                  className="flex-1 min-w-[160px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Add service (press Enter)..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={handleAddService}
                />
              )}
            </div>
          </div>

          {/* ── Fixed-Price Services Section (Inline) ── */}
          <div className="pt-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="text-base font-semibold text-foreground">Fixed-Price Services</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pre-configured services customers can book instantly.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/provider/service-listings")}
              >
                Manage Services
              </Button>
            </div>

            {myServiceListings && myServiceListings.filter((l) => l.isActive).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {myServiceListings
                  .filter((l) => l.isActive)
                  .map((listing) => (
                    <ServiceListingCard key={listing.id} listing={listing} />
                  ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed rounded-lg text-center bg-muted/20">
                <p className="text-sm text-muted-foreground">
                  You haven't listed any fixed-price services yet. Click 'Manage Services' to create
                  one.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Service Area Card ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Service Area</CardTitle>
          <CardDescription>
            Define the geographical area and radius where you provide services.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* ── Sticky Save Footer ── */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border p-4 shadow-lg animate-fade-up">
          <div className="container max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1">
              {saveStatus === "error" && (
                <span className="text-sm font-medium text-destructive">{errorMessage}</span>
              )}
              {saveStatus === "success" && (
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setSaveStatus("idle");
                }}
                disabled={saveStatus === "saving"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveStatus === "saving" || saveStatus === "success"}
              >
                {saveStatus === "saving" ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
