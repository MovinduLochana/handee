import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Eye, CheckCircle2, MapPin, Home } from "lucide-react";
import { providerApi } from "../../api/providers";
import { serviceCategoryApi } from "../../api/serviceCategories";
import { serviceListingsApi } from "../../api/serviceListings";
import ServiceCategoryTag from "../../components/provider/ServiceCategoryTag";
import StatusBadge from "../../components/provider/StatusBadge";
import { extractApiError, getFullMediaUrl } from "../../lib/api";
import LocationPicker from "../../components/provider/LocationPicker";
import ServiceListingCard from "../../components/public/ServiceListingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ProviderProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

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
    return <div className="p-16 text-center text-muted-foreground text-sm">Loading profile...</div>;

  if (!myProfile) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">No Profile Found</h2>
        <p className="text-muted-foreground text-sm">
          You need to complete the verification wizard before managing your profile.
        </p>
        <Button onClick={() => navigate("/provider/verification")}>Start Setup Wizard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
              {myProfile.profilePictureUrl && (
                <AvatarImage src={getFullMediaUrl(myProfile.profilePictureUrl)} alt="Profile" />
              )}
              <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                {myProfile.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{myProfile.fullName}</h1>
                <StatusBadge status={myProfile.verificationStatus} size="sm" />
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground flex-wrap">
                <span>{myProfile.headline ?? "Complete your profile headline"}</span>
                {myProfile.serviceAreaDisplayName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {myProfile.serviceAreaDisplayName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/providers/${myProfile.id}`)}
              className="gap-1.5 text-xs"
            >
              <Eye className="h-4 w-4" /> View Public Profile
            </Button>
            {!isEditing && (
              <Button size="sm" onClick={() => setIsEditing(true)} className="text-xs">
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold">Personal & Business Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Headline</label>
              <Input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Years of Experience
              </label>
              <Input
                type="number"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(parseInt(e.target.value) || "")}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              Bio (Short description)
            </label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={!isEditing}
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Languages</label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded border border-border bg-background min-h-10">
              {languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-foreground"
                >
                  {lang}
                  {isEditing && (
                    <button
                      type="button"
                      className="hover:text-destructive text-sm"
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
                  className="text-xs bg-transparent border-none outline-none flex-1 min-w-36 text-foreground placeholder:text-muted-foreground"
                  placeholder="Add language (press Enter)..."
                  value={langInput}
                  onChange={(e) => setLangInput(e.target.value)}
                  onKeyDown={handleAddLang}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Card */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <strong className="text-sm font-semibold text-foreground block">
                Available for Work
              </strong>
              <span className="text-xs text-muted-foreground">
                Let customers know if you are currently taking on new jobs.
              </span>
            </div>
            <Switch
              checked={isAvailableForWork}
              onCheckedChange={(checked) => isEditing && setIsAvailableForWork(checked)}
              disabled={!isEditing}
            />
          </div>

          {isEditing && !isAvailableForWork && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              <label className="text-xs font-semibold text-muted-foreground">
                Availability Note (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Fully booked until next month."
                value={availabilityNote}
                onChange={(e) => setAvailabilityNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Card */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Address Line 1</label>
              <Input
                type="text"
                placeholder="Street address"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Address Line 2</label>
              <Input
                type="text"
                placeholder="Apt, suite, unit, etc. (optional)"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">City</label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                State / Province
              </label>
              <Input
                type="text"
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Postal Code</label>
              <Input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Country</label>
              <Input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!isEditing}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Services Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Skills & Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Service Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <ServiceCategoryTag
                  key={cat.id}
                  category={cat}
                  selected={selectedSkillIds.has(cat.id)}
                  onClick={isEditing ? () => toggleSkill(cat.id) : undefined}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Specific Services Offered
            </label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded border border-border bg-background min-h-10">
              {servicesOffered.map((srv) => (
                <span
                  key={srv}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-muted text-foreground"
                >
                  {srv}
                  {isEditing && (
                    <button
                      type="button"
                      className="hover:text-destructive text-sm"
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
                  className="text-xs bg-transparent border-none outline-none flex-1 min-w-36 text-foreground placeholder:text-muted-foreground"
                  placeholder="Add service (press Enter)..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={handleAddService}
                />
              )}
            </div>
          </div>

          {/* Fixed-Price Services Section */}
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex justify-between items-center">
              <label className="font-bold text-sm text-foreground">Fixed-Price Services</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/provider/service-listings")}
                className="h-8 text-xs"
              >
                Manage Services
              </Button>
            </div>

            {myServiceListings && myServiceListings.filter((l) => l.isActive).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myServiceListings
                  .filter((l) => l.isActive)
                  .map((listing) => (
                    <ServiceListingCard key={listing.id} listing={listing} />
                  ))}
              </div>
            ) : (
              <div className="p-8 text-center border border-dashed border-border rounded text-xs text-muted-foreground">
                You haven't listed any fixed-price services yet. Click 'Manage Services' to create
                one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Area Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Service Area</CardTitle>
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

      {/* Save Footer */}
      {isEditing && (
        <div className="sticky bottom-6 p-4 bg-card border border-border rounded-xl shadow-xl flex items-center justify-between gap-4 z-40">
          <div className="flex-1 text-xs">
            {saveStatus === "error" && (
              <span className="text-destructive font-semibold">{errorMessage}</span>
            )}
            {saveStatus === "success" && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Changes saved successfully
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setSaveStatus("idle");
              }}
              disabled={saveStatus === "saving"}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveStatus === "saving" || saveStatus === "success"}
              className="text-xs"
            >
              {saveStatus === "saving" ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
