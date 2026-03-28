import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const OnboardingIncompleteBanner = () => {
  const navigate = useNavigate();

  return (
    <Alert className="mb-6 border-warning bg-warning/10">
      <AlertTriangle className="h-5 w-5 text-warning" />
      <AlertTitle className="text-warning font-semibold">
        Complete Your Registration
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-muted-foreground mb-3">
          Your profile setup is incomplete. Complete your registration to unlock all features including adding records.
        </p>
        <Button 
          onClick={() => navigate('/auth?resume=true')} 
          className="gradient-primary"
          size="sm"
        >
          Continue Registration
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default OnboardingIncompleteBanner;
