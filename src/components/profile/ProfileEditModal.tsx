import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2, Upload, User, Car, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NIGERIAN_STATES, NIGERIAN_BANKS, PREFIX_OPTIONS, APARTMENT_STYLES, APARTMENT_OWN_TYPES } from '@/types/onyx';
import { cn } from '@/lib/utils';

interface ProfileData {
  id: string;
  surname: string | null;
  first_name: string | null;
  other_name: string | null;
  preferred_name: string | null;
  prefix: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  house_address: string | null;
  office_address: string | null;
  state: string | null;
  lga: string | null;
  lcda: string | null;
  occupation: string | null;
  identity_type: string | null;
  identity_number: string | null;
  lassra_no: string | null;
  passport_photo_url: string | null;
  num_banks: number | null;
  banks_list: string[] | null;
  num_cars: number | null;
  num_houses: number | null;
  apartment_style: string | null;
  apartment_type: string | null;
  rent_amount: number | null;
  has_mortgage: boolean | null;
}

type EditSection = 'personal' | 'contact' | 'address' | 'identity' | 'housing' | 'assets';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: EditSection;
  profile: ProfileData | null;
  onSave: () => void;
}

const ProfileEditModal = ({ isOpen, onClose, section, profile, onSave }: ProfileEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Personal fields
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [otherName, setOtherName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address fields
  const [houseAddress, setHouseAddress] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [lcda, setLcda] = useState('');
  
  // Identity fields
  const [occupation, setOccupation] = useState('');
  const [lassraNo, setLassraNo] = useState('');
  const [passportPhotoUrl, setPassportPhotoUrl] = useState('');
  
  // Housing fields
  const [apartmentStyle, setApartmentStyle] = useState('');
  const [apartmentType, setApartmentType] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [hasMortgage, setHasMortgage] = useState<'yes' | 'no' | ''>('');
  
  // Assets fields
  const [numBanks, setNumBanks] = useState('');
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [numCars, setNumCars] = useState('');
  const [numHouses, setNumHouses] = useState('');

  // Initialize form values from profile
  useEffect(() => {
    if (profile && isOpen) {
      setSurname(profile.surname || '');
      setFirstName(profile.first_name || '');
      setOtherName(profile.other_name || '');
      setPreferredName(profile.preferred_name || '');
      setPrefix(profile.prefix || '');
      setDateOfBirth(profile.date_of_birth || '');
      setGender(profile.gender || '');
      setPhone(profile.phone || '');
      setHouseAddress(profile.house_address || '');
      setOfficeAddress(profile.office_address || '');
      setState(profile.state || '');
      setLga(profile.lga || '');
      setLcda(profile.lcda || '');
      setOccupation(profile.occupation || '');
      setLassraNo(profile.lassra_no || '');
      setPassportPhotoUrl(profile.passport_photo_url || '');
      setApartmentStyle(profile.apartment_style || '');
      setApartmentType(profile.apartment_type || '');
      setRentAmount(profile.rent_amount?.toString() || '');
      setHasMortgage(profile.has_mortgage ? 'yes' : profile.has_mortgage === false ? 'no' : '');
      setNumBanks(profile.num_banks?.toString() || '');
      setSelectedBanks(profile.banks_list || []);
      setNumCars(profile.num_cars?.toString() || '');
      setNumHouses(profile.num_houses?.toString() || '');
    }
  }, [profile, isOpen]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.id}/passport.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('statements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('statements')
        .createSignedUrl(filePath, 86400);

      if (signedError) throw signedError;

      setPassportPhotoUrl(signedUrlData.signedUrl);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
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

  const handleSave = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    try {
      let updates: Record<string, unknown> = {};
      
      switch (section) {
        case 'personal':
          updates = {
            surname: surname.trim(),
            first_name: firstName.trim(),
            other_name: otherName.trim() || null,
            preferred_name: preferredName.trim() || null,
            prefix: prefix || null,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            phone: phone.trim() || null,
            name: `${firstName.trim()} ${surname.trim()}`,
          };
          break;
        case 'contact':
          updates = {
            phone: phone.trim() || null,
          };
          break;
        case 'address':
          updates = {
            house_address: houseAddress.trim() || null,
            office_address: officeAddress.trim() || null,
            state: state || null,
            lga: lga.trim() || null,
            lcda: lcda.trim() || null,
          };
          break;
        case 'identity':
          updates = {
            occupation: occupation.trim() || null,
            lassra_no: lassraNo.trim() || null,
            passport_photo_url: passportPhotoUrl || null,
          };
          break;
        case 'housing':
          updates = {
            apartment_style: apartmentStyle || null,
            apartment_type: apartmentType || null,
            rent_amount: rentAmount ? parseFloat(rentAmount) : null,
            has_mortgage: hasMortgage === 'yes',
          };
          break;
        case 'assets':
          updates = {
            num_banks: parseInt(numBanks) || 0,
            banks_list: selectedBanks.length > 0 ? selectedBanks : null,
            num_cars: parseInt(numCars) || 0,
            num_houses: parseInt(numHouses) || 0,
          };
          break;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getSectionTitle = () => {
    switch (section) {
      case 'personal': return 'Edit Personal Information';
      case 'contact': return 'Edit Contact Information';
      case 'address': return 'Edit Address Information';
      case 'identity': return 'Edit Identity & Work';
      case 'housing': return 'Edit Housing Information';
      case 'assets': return 'Edit Assets & Banking';
    }
  };

  const renderPersonalFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prefix</Label>
          <Select value={prefix} onValueChange={setPrefix}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {PREFIX_OPTIONS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Surname</Label>
        <Input
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          placeholder="Enter surname"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
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
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08012345678"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
      </div>
    </div>
  );

  const renderContactFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          value={profile?.email || ''}
          disabled
          className="h-12 bg-muted/50 border-0 rounded-xl text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
      </div>
      <div className="space-y-2">
        <Label>Phone Number</Label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="08012345678"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>
    </div>
  );

  const renderAddressFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>House Address</Label>
        <Input
          value={houseAddress}
          onChange={(e) => setHouseAddress(e.target.value)}
          placeholder="Enter your house address"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
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
        <Label>State</Label>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
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
    </div>
  );

  const renderIdentityFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Occupation</Label>
        <Input
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder="e.g. Pastor, Teacher, Engineer"
          className="h-12 bg-secondary/50 border-0 rounded-xl"
        />
      </div>
      <div className="space-y-2">
        <Label>Identity Type</Label>
        <Input
          value={profile?.identity_type || ''}
          disabled
          className="h-12 bg-muted/50 border-0 rounded-xl text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Identity type cannot be changed</p>
      </div>
      <div className="space-y-2">
        <Label>Identity Number</Label>
        <Input
          value={profile?.identity_number ? `****${profile.identity_number.slice(-4)}` : ''}
          disabled
          className="h-12 bg-muted/50 border-0 rounded-xl text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Identity number cannot be changed</p>
      </div>
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
              id="photo-upload"
              disabled={uploadingPhoto}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              disabled={uploadingPhoto}
              onClick={() => document.getElementById('photo-upload')?.click()}
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
    </div>
  );

  const renderHousingFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Type of Apartment</Label>
        <Select value={apartmentStyle} onValueChange={setApartmentStyle}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select apartment type" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {APARTMENT_STYLES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Ownership Type</Label>
        <Select value={apartmentType} onValueChange={setApartmentType}>
          <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select ownership type" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            {APARTMENT_OWN_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {apartmentType === 'tenant' && (
        <div className="space-y-2">
          <Label>Annual Rent Amount (₦)</Label>
          <Input
            type="number"
            value={rentAmount}
            onChange={(e) => setRentAmount(e.target.value)}
            placeholder="Enter annual rent amount"
            className="h-12 bg-secondary/50 border-0 rounded-xl"
          />
        </div>
      )}
      
      {apartmentType === 'owner' && (
        <div className="space-y-2">
          <Label>Do you have a mortgage?</Label>
          <Select value={hasMortgage} onValueChange={(v) => setHasMortgage(v as 'yes' | 'no')}>
            <SelectTrigger className="h-12 bg-secondary/50 border-0 rounded-xl">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const renderAssetsFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Number of Banks</Label>
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
    </div>
  );

  const renderFields = () => {
    switch (section) {
      case 'personal': return renderPersonalFields();
      case 'contact': return renderContactFields();
      case 'address': return renderAddressFields();
      case 'identity': return renderIdentityFields();
      case 'housing': return renderHousingFields();
      case 'assets': return renderAssetsFields();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 lg:inset-0 lg:flex lg:items-center lg:justify-center z-50"
          >
            <div className="bg-card rounded-t-3xl lg:rounded-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-lg">
              <div className="sticky top-0 bg-card px-6 py-4 border-b border-border flex items-center justify-between rounded-t-3xl">
                <h2 className="text-lg font-bold text-foreground">{getSectionTitle()}</h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-6">
                {renderFields()}
                
                <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 h-12 rounded-xl"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 h-12 rounded-xl gradient-primary hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileEditModal;
