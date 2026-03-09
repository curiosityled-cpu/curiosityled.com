import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Award, CheckCircle2 } from 'lucide-react';

export default function UserQualificationsBanner({ userEmail, targetRole }) {
  const { data: userCerts, isLoading } = useQuery({
    queryKey: ['user-certs-for-path', userEmail],
    queryFn: async () => {
      const certs = await base44.entities.Certification.filter({
        user_email: userEmail,
        status: 'verified'
      });
      return certs;
    },
    enabled: !!userEmail,
    staleTime: 10 * 60 * 1000
  });

  if (isLoading || !userCerts || !targetRole) return null;

  const requiredCerts = targetRole.required_qualifications?.certifications || [];
  const preferredCerts = targetRole.preferred_qualifications?.certifications || [];
  
  if (requiredCerts.length === 0 && preferredCerts.length === 0) return null;

  // Match user's certifications against role requirements
  const userCertNames = userCerts.map(c => c.name.toLowerCase());
  
  const matchedRequired = requiredCerts.filter(req => 
    userCertNames.some(userCert => userCert.includes(req.toLowerCase()) || req.toLowerCase().includes(userCert))
  );
  
  const matchedPreferred = preferredCerts.filter(pref =>
    userCertNames.some(userCert => userCert.includes(pref.toLowerCase()) || pref.toLowerCase().includes(userCert))
  );

  const hasAllRequired = matchedRequired.length === requiredCerts.length;
  const missingRequired = requiredCerts.filter(req => !matchedRequired.includes(req));

  return (
    <Alert className={hasAllRequired ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
      <Award className={`h-4 w-4 ${hasAllRequired ? 'text-green-600' : 'text-blue-600'}`} />
      <AlertDescription className={hasAllRequired ? 'text-green-900' : 'text-blue-900'}>
        {hasAllRequired ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="font-semibold">You meet all required certifications!</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {matchedRequired.map((cert, idx) => (
                <Badge key={idx} className="bg-green-100 text-green-800 text-xs">
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">Certification Requirements:</p>
            {matchedRequired.length > 0 && (
              <div>
                <p className="text-xs mb-1">✓ You have:</p>
                <div className="flex flex-wrap gap-1">
                  {matchedRequired.map((cert, idx) => (
                    <Badge key={idx} className="bg-green-100 text-green-800 text-xs">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {missingRequired.length > 0 && (
              <div>
                <p className="text-xs mb-1">Required to obtain:</p>
                <div className="flex flex-wrap gap-1">
                  {missingRequired.map((cert, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {matchedPreferred.length > 0 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs mb-1">✓ Bonus qualifications you have:</p>
            <div className="flex flex-wrap gap-1">
              {matchedPreferred.map((cert, idx) => (
                <Badge key={idx} className="bg-blue-100 text-blue-800 text-xs">
                  {cert}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}