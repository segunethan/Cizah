import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, User, MapPin, Briefcase, Building2, Car, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NIGERIAN_STATES, NIGERIAN_BANKS, PREFIX_OPTIONS, APARTMENT_STYLES, APARTMENT_OWN_TYPES } from '@/types/onyx';
import { cn } from '@/lib/utils';
import { profileSchema, validateInput } from '@/lib/validation';

interface Phase2ProfileProps {
  userId: string;
  onComplete: () => void;
  onBack: () => void;
}

type Step = 'personal' | 'contact' | 'identity' | 'housing' | 'financial';

// Field error type for inline validation
interface FieldErrors {
  phone?: string;
  identityNumber?: string;
  surname?: string;
  firstName?: string;
  houseAddress?: string;
  occupation?: string;
  apartmentStyle?: string;
  apartmentType?: string;
  rentAmount?: string;
  [key: string]: string | undefined;
}

const Phase2Profile = ({ userId, onComplete, onBack }: Phase2ProfileProps) => {
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingRentAgreement, setUploadingRentAgreement] = useState(false);
  const [uploadingRentReceipt, setUploadingRentReceipt] = useState(false);
  
  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Personal Information
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');

  // Address Information
  const [houseAddress, setHouseAddress] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [lcda, setLcda] = useState('');

  // Identity & Work
  const [occupation, setOccupation] = useState('');
  const [identityType, setIdentityType] = useState<'BVN' | 'NIN' | ''>('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [lassraNo, setLassraNo] = useState('');
  const [passportPhotoUrl, setPassportPhotoUrl] = useState('');

  // Housing Information
  const [apartmentStyle, setApartmentStyle] = useState<'flat' | 'bungalow' | 'duplex' | 'studio' | 'mini_flat' | ''>('');
  const [apartmentType, setApartmentType] = useState<'tenant' | 'owner' | 'mission' | 'gift' | 'family' | ''>('');
  const [rentAmount, setRentAmount] = useState('');
  const [rentAgreementUrl, setRentAgreementUrl] = useState('');
  const [rentAgreementFileName, setRentAgreementFileName] = useState('');
  const [rentReceiptUrl, setRentReceiptUrl] = useState('');
  const [rentReceiptFileName, setRentReceiptFileName] = useState('');
  const [hasMortgage, setHasMortgage] = useState<'yes' | 'no' | ''>('');

  // Financial & Asset
  const [numBanks, setNumBanks] = useState('');
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [numCars, setNumCars] = useState('');
  const [numHouses, setNumHouses] = useState('');

  const steps: Step[] = ['personal', 'contact', 'identity', 'housing', 'financial'];
  
  // Phone validation regex for Nigerian numbers
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
  
  // Clear field error when user starts typing
  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  const currentStepIndex = steps.indexOf(step);

  // Load existing profile data when resuming onboarding
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          // Personal
          if (profile.surname) setSurname(profile.surname);
          if (profile.first_name) setFirstName(profile.first_name);
          if (profile.other_name) setOtherName(profile.other_name);
          if (profile.preferred_name) setPreferredName(profile.preferred_name);
          if (profile.prefix) setPrefix(profile.prefix);
          if (profile.date_of_birth) setDateOfBirth(profile.date_of_birth);
          if (profile.gender) setGender(profile.gender);
          if (profile.phone) setPhone(profile.phone);
          
          // Contact
          if (profile.house_address) setHouseAddress(profile.house_address);
          if (profile.office_address) setOfficeAddress(profile.office_address);
          if (profile.state) setState(profile.state);
          if (profile.lga) setLga(profile.lga);
          if (profile.lcda) setLcda(profile.lcda);
          
          // Identity
          if (profile.occupation) setOccupation(profile.occupation);
          if (profile.identity_type) setIdentityType(profile.identity_type as 'BVN' | 'NIN');
          if (profile.identity_number) setIdentityNumber(profile.identity_number);
          if (profile.lassra_no) setLassraNo(profile.lassra_no);
          if (profile.passport_photo_url) setPassportPhotoUrl(profile.passport_photo_url);
          
          // Housing
          if (profile.apartment_style) setApartmentStyle(profile.apartment_style as 'flat' | 'bungalow' | 'duplex' | 'studio' | 'mini_flat');
          if (profile.apartment_type) setApartmentType(profile.apartment_type as 'tenant' | 'owner' | 'mission' | 'gift' | 'family');
          if (profile.rent_amount) setRentAmount(profile.rent_amount.toString());
          if (profile.rent_agreement_url) setRentAgreementUrl(profile.rent_agreement_url);
          if (profile.rent_receipt_url) setRentReceiptUrl(profile.rent_receipt_url);
          if (profile.has_mortgage !== null) setHasMortgage(profile.has_mortgage ? 'yes' : 'no');
          
          // Financial
          if (profile.num_banks !== null && profile.num_banks !== undefined) setNumBanks(profile.num_banks.toString());
          if (profile.banks_list) setSelectedBanks(profile.banks_list);
          if (profile.num_cars !== null && profile.num_cars !== undefined) setNumCars(profile.num_cars.toString());
          if (profile.num_houses !== null && profile.num_houses !== undefined) setNumHouses(profile.num_houses.toString());
        }
      } catch (error) {
        console.error('Error loading existing profile:', error);
      }
    };

    loadExistingData();
  }, [userId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/passport.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Use signed URL instead of public URL for security
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('statements')
        .createSignedUrl(filePath, 86400); // 24 hour expiry

      if (signedError) throw signedError;

      setPassportPhotoUrl(signedUrlData.signedUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRentAgreementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be less than 10MB');
      return;
    }

    setUploadingRentAgreement(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/rent-agreement.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Use signed URL instead of public URL for security
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('statements')
        .createSignedUrl(filePath, 86400); // 24 hour expiry

      if (signedError) throw signedError;

      setRentAgreementUrl(signedUrlData.signedUrl);
      setRentAgreementFileName(file.name);
      toast.success('Rent agreement uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload rent agreement');
    } finally {
      setUploadingRentAgreement(false);
    }
  };

  const handleRentReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be less than 10MB');
      return;
    }

    setUploadingRentReceipt(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/rent-receipt.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Use signed URL instead of public URL for security
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('statements')
        .createSignedUrl(filePath, 86400); // 24 hour expiry

      if (signedError) throw signedError;

      setRentReceiptUrl(signedUrlData.signedUrl);
      setRentReceiptFileName(file.name);
      toast.success('Rent receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload rent receipt');
    } finally {
      setUploadingRentReceipt(false);
    }
  };

  const handleBankSelection = (bank: string) => {
    if (selectedBanks.includes(bank)) {
      setSelectedBanks(selectedBanks.filter(b => b !== bank));
    } else {
      const max = parseInt(numBanks) || 10;
      if (selectedBanks.length < max) {
        setSelectedBanks([...selectedBanks, bank]);
      } else {
        toast.error(`You can only select up to ${max} banks`);
      }
    }
  };

  const validateStep = (): boolean => {
    const errors: FieldErrors = {};
    
    switch (step) {
      case 'personal':
        if (!surname.trim()) {
          errors.surname = 'Surname is required';
        }
        if (!firstName.trim()) {
          errors.firstName = 'First name is required';
        }
        if (!prefix) {
          toast.error('Please select a prefix');
          return false;
        }
        if (!dateOfBirth) {
          toast.error('Please enter your date of birth');
          return false;
        }
        if (!gender) {
          toast.error('Please select your gender');
          return false;
        }
        if (!phone.trim()) {
          errors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(phone.trim())) {
          errors.phone = 'Invalid Nigerian phone number (e.g., 08012345678)';
        }
        break;
      case 'contact':
        if (!houseAddress.trim()) {
          errors.houseAddress = 'House address is required';
        }
        if (!state) {
          toast.error('Please select your state');
          return false;
        }
        break;
      case 'identity':
        if (!occupation.trim()) {
          errors.occupation = 'Occupation is required';
        }
        if (!identityType) {
          toast.error('Please select BVN or NIN');
          return false;
        }
        if (!identityNumber.trim()) {
          errors.identityNumber = `${identityType || 'Identity'} number is required`;
        } else if (identityNumber.trim().length !== 11) {
          errors.identityNumber = `${identityType} must be exactly 11 digits`;
        } else if (!/^\d+$/.test(identityNumber.trim())) {
          errors.identityNumber = `${identityType} must contain only digits`;
        }
        break;
      case 'housing':
        if (!apartmentStyle) {
          toast.error('Please select the type of apartment');
          return false;
        }
        if (!apartmentType) {
          toast.error('Please select your ownership type');
          return false;
        }
        if (apartmentType === 'tenant' && !rentAmount.trim()) {
          errors.rentAmount = 'Rent amount is required for tenants';
        }
        if (apartmentType === 'owner' && !hasMortgage) {
          toast.error('Please indicate if you have a mortgage');
          return false;
        }
        break;
      case 'financial':
        return true;
      default:
        return true;
    }
    
    // Set field errors and show first error as toast
    setFieldErrors(errors);
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      toast.error(errors[errorKeys[0]]);
      return false;
    }
    
    return true;
  };

  // Save progress after each step using upsert to avoid duplicate key errors
  const saveStepProgress = async (stepData: Record<string, unknown>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || null;
      
      // Use upsert to avoid duplicate key constraint errors
      // This will insert if not exists, update if exists
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          name: `${firstName.trim()} ${surname.trim()}`.trim() || 'User',
          email: userEmail,
          ...stepData,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        // Don't show error to user, just log it - this shouldn't block their progress
        console.error('Failed to save step progress:', error);
      }
    } catch (error) {
      console.error('Error saving step progress:', error);
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    // Save the data from the current step before moving to next
    let stepData: Record<string, unknown> = {};
    
    switch (step) {
      case 'personal':
        stepData = {
          name: `${firstName.trim()} ${surname.trim()}`,
          surname: surname.trim(),
          first_name: firstName.trim(),
          other_name: otherName?.trim() || null,
          preferred_name: preferredName?.trim() || null,
          prefix: prefix || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          phone: phone?.trim() || null,
        };
        break;
      case 'contact':
        stepData = {
          house_address: houseAddress?.trim() || null,
          office_address: officeAddress?.trim() || null,
          state: state || null,
          lga: lga?.trim() || null,
          lcda: lcda?.trim() || null,
        };
        break;
      case 'identity':
        stepData = {
          occupation: occupation?.trim() || null,
          identity_type: identityType || null,
          identity_number: identityNumber?.trim() || null,
          lassra_no: lassraNo?.trim() || null,
          passport_photo_url: passportPhotoUrl || null,
        };
        break;
      case 'housing':
        stepData = {
          apartment_style: apartmentStyle || null,
          apartment_type: apartmentType || null,
          rent_amount: rentAmount ? parseFloat(rentAmount) : null,
          rent_agreement_url: rentAgreementUrl || null,
          rent_receipt_url: rentReceiptUrl || null,
          has_mortgage: hasMortgage === 'yes',
        };
        break;
      case 'financial':
        stepData = {
          num_banks: parseInt(numBanks) || 0,
          banks_list: selectedBanks.length > 0 ? selectedBanks : null,
          num_cars: parseInt(numCars) || 0,
          num_houses: parseInt(numHouses) || 0,
        };
        break;
    }
    
    // Save progress in background (don't block UI)
    saveStepProgress(stepData);
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handlePrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      onBack();
    }
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      // Get the user's email from auth
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || null;

      // Prepare profile data for validation
      const profileData = {
        surname: surname.trim(),
        first_name: firstName.trim(),
        other_name: otherName?.trim() || null,
        preferred_name: preferredName?.trim() || null,
        prefix: prefix || null,
        date_of_birth: dateOfBirth || null,
        gender: gender as 'Male' | 'Female' | null,
        phone: phone?.trim() || null,
        house_address: houseAddress?.trim() || null,
        office_address: officeAddress?.trim() || null,
        state: state || null,
        lga: lga?.trim() || null,
        lcda: lcda?.trim() || null,
        occupation: occupation?.trim() || null,
        identity_type: identityType as 'BVN' | 'NIN' | null,
        identity_number: identityNumber?.trim() || null,
        lassra_no: lassraNo?.trim() || null,
        passport_photo_url: passportPhotoUrl || null,
        apartment_style: apartmentStyle || null,
        apartment_type: apartmentType || null,
        rent_amount: rentAmount ? parseFloat(rentAmount) : null,
        rent_agreement_url: rentAgreementUrl || null,
        rent_receipt_url: rentReceiptUrl || null,
        has_mortgage: hasMortgage === 'yes',
        num_banks: parseInt(numBanks) || 0,
        banks_list: selectedBanks.length > 0 ? selectedBanks : null,
        num_cars: parseInt(numCars) || 0,
        num_houses: parseInt(numHouses) || 0,
      };

      // Validate profile data
      const validationResult = validateInput(profileSchema.partial(), profileData);
      if (!validationResult.success) {
        toast.error('error' in validationResult ? validationResult.error : 'Validation failed');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          name: `${firstName.trim()} ${surname.trim()}`,
          email: userEmail,
          ...validationResult.data,
          onboarding_completed: true,
        });

      if (error) throw error;

      toast.success('Profile saved successfully!');
      onComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div
          key={s}
          className={cn(
            "w-2 h-2 rounded-full transition-all duration-300",
            i === currentStepIndex
              ? "w-8 bg-primary"
              : i < currentStepIndex
              ? "bg-primary"
              : "bg-secondary"
          )}
        />
      ))}
    </div>
  );

  const renderPersonalStep = () => (
    <motion.div
      key="personal"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
          <p className="text-sm text-muted-foreground">Tell us about yourself</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prefix *</Label>
          <Select value={prefix} onValueChange={setPrefix}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {PREFIX_OPTIONS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gender *</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Surname *</Label>
        <Input
          value={surname}
          onChange={(e) => {
            setSurname(e.target.value);
            clearFieldError('surname');
          }}
          placeholder="Enter surname"
          className={cn(
            "h-12 bg-secondary/50 border-0 rounded-xl",
            fieldErrors.surname && "ring-2 ring-destructive"
          )}
        />
        {fieldErrors.surname && (
          <p className="text-sm text-destructive">{fieldErrors.surname}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name *</Label>
          <Input
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearFieldError('firstName');
            }}
            placeholder="First name"
            className={cn(
              "h-12 bg-secondary/50 border-0 rounded-xl",
              fieldErrors.firstName && "ring-2 ring-destructive"
            )}
          />
          {fieldErrors.firstName && (
            <p className="text-sm text-destructive">{fieldErrors.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Other Name</Label>
          <Input
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            placeholder="Other name"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Preferred Name</Label>
        <Input
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="What should we call you?"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearFieldError('phone');
            }}
            placeholder="08012345678"
            className={cn(
              "h-12 bg-secondary/50 border-0 rounded-xl",
              fieldErrors.phone && "ring-2 ring-destructive"
            )}
          />
          {fieldErrors.phone && (
            <p className="text-sm text-destructive">{fieldErrors.phone}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderContactStep = () => (
    <motion.div
      key="contact"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Address Information</h2>
          <p className="text-sm text-muted-foreground">Where can we reach you?</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>House Address *</Label>
        <Input
          value={houseAddress}
          onChange={(e) => {
            setHouseAddress(e.target.value);
            clearFieldError('houseAddress');
          }}
          placeholder="Enter your house address"
          className={cn(
            "h-12 bg-secondary/50 border-0 rounded-xl",
            fieldErrors.houseAddress && "ring-2 ring-destructive"
          )}
        />
        {fieldErrors.houseAddress && (
          <p className="text-sm text-destructive">{fieldErrors.houseAddress}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Office Address</Label>
        <Input
          value={officeAddress}
          onChange={(e) => setOfficeAddress(e.target.value)}
          placeholder="Enter your office address"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>State *</Label>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {NIGERIAN_STATES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>LGA</Label>
          <Input
            value={lga}
            onChange={(e) => setLga(e.target.value)}
            placeholder="Local Government"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>LCDA</Label>
          <Input
            value={lcda}
            onChange={(e) => setLcda(e.target.value)}
            placeholder="LCDA (if applicable)"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderIdentityStep = () => (
    <motion.div
      key="identity"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Identity & Work</h2>
          <p className="text-sm text-muted-foreground">Verification details</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Occupation *</Label>
        <Input
          value={occupation}
          onChange={(e) => {
            setOccupation(e.target.value);
            clearFieldError('occupation');
          }}
          placeholder="e.g. Pastor, Teacher, Engineer"
          className={cn(
            "h-12 bg-secondary/50 border-0 rounded-xl",
            fieldErrors.occupation && "ring-2 ring-destructive"
          )}
        />
        {fieldErrors.occupation && (
          <p className="text-sm text-destructive">{fieldErrors.occupation}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Identity Type *</Label>
        <Select value={identityType} onValueChange={(v) => setIdentityType(v as 'BVN' | 'NIN')}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select BVN or NIN" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BVN">BVN (Bank Verification Number)</SelectItem>
            <SelectItem value="NIN">NIN (National ID Number)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {identityType && (
        <div className="space-y-2">
          <Label>{identityType} Number *</Label>
          <Input
            value={identityNumber}
            onChange={(e) => {
              setIdentityNumber(e.target.value);
              clearFieldError('identityNumber');
            }}
            placeholder={`Enter your ${identityType} (11 digits)`}
            className={cn(
              "h-12 bg-secondary/50 border-0 rounded-xl",
              fieldErrors.identityNumber && "ring-2 ring-destructive"
            )}
            maxLength={11}
          />
          {fieldErrors.identityNumber && (
            <p className="text-sm text-destructive">{fieldErrors.identityNumber}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>LASSRA No (Optional)</Label>
        <Input
          value={lassraNo}
          onChange={(e) => setLassraNo(e.target.value)}
          placeholder="Lagos State Residents Registration"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>Passport Photograph</Label>
        <div className="flex items-center gap-4">
          {passportPhotoUrl ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden">
              <img src={passportPhotoUrl} alt="Passport" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-secondary/50 rounded-xl flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              disabled={uploadingPhoto}
              onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            >
              {uploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {passportPhotoUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
          </label>
        </div>
      </div>
    </motion.div>
  );

  const renderHousingStep = () => (
    <motion.div
      key="housing"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <Home className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Housing Information</h2>
          <p className="text-sm text-muted-foreground">Tell us about your accommodation</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Type of Apartment *</Label>
        <Select value={apartmentStyle} onValueChange={(v) => setApartmentStyle(v as 'flat' | 'bungalow' | 'duplex' | 'studio' | 'mini_flat')}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select apartment type" />
          </SelectTrigger>
          <SelectContent>
            {APARTMENT_STYLES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Ownership Type *</Label>
        <Select value={apartmentType} onValueChange={(v) => setApartmentType(v as 'tenant' | 'owner' | 'mission' | 'gift' | 'family')}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select ownership type" />
          </SelectTrigger>
          <SelectContent>
            {APARTMENT_OWN_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {apartmentType === 'tenant' && (
        <>
          <div className="space-y-2">
            <Label>Annual Rent Amount (₦) *</Label>
            <Input
              type="number"
              value={rentAmount}
              onChange={(e) => {
                setRentAmount(e.target.value);
                clearFieldError('rentAmount');
              }}
              placeholder="Enter annual rent amount"
              className={cn(
                "h-12 bg-secondary/50 border-0 rounded-xl",
                fieldErrors.rentAmount && "ring-2 ring-destructive"
              )}
            />
            {fieldErrors.rentAmount && (
              <p className="text-sm text-destructive">{fieldErrors.rentAmount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Rent Agreement <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleRentAgreementUpload}
                  className="hidden"
                  id="rent-agreement-upload"
                  disabled={uploadingRentAgreement}
                />
                <label htmlFor="rent-agreement-upload" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={uploadingRentAgreement}
                    asChild
                  >
                    <span>
                      {uploadingRentAgreement ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {rentAgreementUrl ? 'Change Document' : 'Upload Rent Agreement'}
                    </span>
                  </Button>
                </label>
              </div>
              {rentAgreementFileName && (
                <p className="text-sm text-primary flex items-center gap-1">
                  ✓ {rentAgreementFileName}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rent Payment Receipt <span className="text-muted-foreground">(optional)</span></Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleRentReceiptUpload}
                  className="hidden"
                  id="rent-receipt-upload"
                  disabled={uploadingRentReceipt}
                />
                <label htmlFor="rent-receipt-upload" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={uploadingRentReceipt}
                    asChild
                  >
                    <span>
                      {uploadingRentReceipt ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {rentReceiptUrl ? 'Change Receipt' : 'Upload Rent Receipt'}
                    </span>
                  </Button>
                </label>
              </div>
              {rentReceiptFileName && (
                <p className="text-sm text-primary flex items-center gap-1">
                  ✓ {rentReceiptFileName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">Upload receipt showing rent payment in your name</p>
            </div>
          </div>
        </>
      )}

      {apartmentType === 'owner' && (
        <div className="space-y-2">
          <Label>Do you have a mortgage? *</Label>
          <Select value={hasMortgage} onValueChange={(v) => setHasMortgage(v as 'yes' | 'no')}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
          
          {hasMortgage === 'yes' && (
            <p className="text-sm text-muted-foreground mt-2 p-3 bg-primary/10 rounded-lg">
              💡 You can claim Mortgage Interest as a tax relief. Make sure to select it in the Relief Preferences section in Settings.
            </p>
          )}
        </div>
      )}

      {(apartmentType === 'gift' || apartmentType === 'mission' || apartmentType === 'family') && (
        <p className="text-sm text-muted-foreground p-3 bg-secondary/50 rounded-lg">
          Your accommodation is provided, so no rent or mortgage information is needed.
        </p>
      )}
    </motion.div>
  );

  const renderFinancialStep = () => (
    <motion.div
      key="financial"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Financial & Assets</h2>
          <p className="text-sm text-muted-foreground">Tell us about your assets</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Number of Banks you operate in Nigeria</Label>
        <Input
          type="number"
          min="0"
          max="20"
          value={numBanks}
          onChange={(e) => setNumBanks(e.target.value)}
          placeholder="How many banks do you use?"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>

      {parseInt(numBanks) > 0 && (
        <div className="space-y-2">
          <Label>Select your banks ({selectedBanks.length}/{numBanks})</Label>
          <div className="max-h-40 overflow-y-auto rounded-xl bg-secondary/30 p-3 space-y-1">
            {NIGERIAN_BANKS.map(bank => (
              <button
                key={bank}
                type="button"
                onClick={() => handleBankSelection(bank)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  selectedBanks.includes(bank)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                )}
              >
                {bank}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            Number of Cars
          </Label>
          <Input
            type="number"
            min="0"
            value={numCars}
            onChange={(e) => setNumCars(e.target.value)}
            placeholder="0"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Number of Houses
          </Label>
          <Input
            type="number"
            min="0"
            value={numHouses}
            onChange={(e) => setNumHouses(e.target.value)}
            placeholder="0"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full">
      {renderStepIndicator()}
      
      <div className="min-h-[400px]">
        {step === 'personal' && renderPersonalStep()}
        {step === 'contact' && renderContactStep()}
        {step === 'identity' && renderIdentityStep()}
        {step === 'housing' && renderHousingStep()}
        {step === 'financial' && renderFinancialStep()}
      </div>

      <div className="flex gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrev}
          className="flex-1 h-14 rounded-xl"
          disabled={loading}
        >
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        
        {step === 'financial' ? (
          <Button
            type="button"
            onClick={handleSubmit}
            className="flex-1 h-14 rounded-xl gradient-primary hover:opacity-90"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Save and Continue'
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            className="flex-1 h-14 rounded-xl gradient-primary hover:opacity-90"
          >
            Save and Continue
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Phase2Profile;
