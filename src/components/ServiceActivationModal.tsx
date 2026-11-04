import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  Award, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Check, 
  Clock
} from 'lucide-react';
import { ServiceItem, getCatalogServiceCategory } from '../data/serviceCatalog';
import { ServiceVerification, ServiceVerificationDoc, UserProfile } from '../types';
import { compressImageFile, saveServiceVerification, deactivateService } from '../lib/verificationService';
import { toast } from 'sonner';

interface ServiceActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  currentVerification?: ServiceVerification | null;
  allVerifications?: Record<string, ServiceVerification>;
  user: UserProfile;
  onVerificationSaved?: () => void;
}

export default function ServiceActivationModal({
  isOpen,
  onClose,
  service,
  currentVerification,
  allVerifications,
  user,
  onVerificationSaved
}: ServiceActivationModalProps) {
  if (!isOpen || !service) return null;

  const categoryGroup = getCatalogServiceCategory(service) || 'Domestic Services';
  const isAlreadyVerified = currentVerification?.status === 'verified';
  const isUnderReview = currentVerification?.status === 'pending';

  // Active view: 'form' | 'details'
  const [viewMode, setViewMode] = useState<'form' | 'details'>(
    isAlreadyVerified || isUnderReview ? 'details' : 'form'
  );

  // Check if provider already has selfie and ID verified/recorded in another service or profile
  const existingIdentitySource = React.useMemo(() => {
    // 1. Check allVerifications passed from ProviderMyServices
    const verifValues = Object.values(allVerifications || {});
    const matchFromAll = verifValues.find(v => Boolean(v?.selfie?.dataUrl && v?.idDocument?.idNumber));
    if (matchFromAll) return matchFromAll;

    // 2. Check user.serviceVerifications
    const userVerifs = Object.values(user?.serviceVerifications || {});
    const matchFromUser = userVerifs.find(v => Boolean(v?.selfie?.dataUrl && v?.idDocument?.idNumber));
    if (matchFromUser) return matchFromUser;

    return null;
  }, [allVerifications, user?.serviceVerifications]);

  const hasExistingIdentity = Boolean(
    (existingIdentitySource?.selfie?.dataUrl || currentVerification?.selfie?.dataUrl) &&
    (existingIdentitySource?.idDocument?.idNumber || currentVerification?.idDocument?.idNumber)
  );

  // Toggle if user explicitly wants to update their ID / Selfie for this service
  const [showIdentityOverride, setShowIdentityOverride] = useState(false);

  // Category 1: Selfie
  const [selfieDoc, setSelfieDoc] = useState<ServiceVerificationDoc | null>(
    currentVerification?.selfie || existingIdentitySource?.selfie || null
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Category 2: ID
  const [idType, setIdType] = useState<'national_id' | 'passport' | 'alien_card'>(
    currentVerification?.idDocument?.idType || existingIdentitySource?.idDocument?.idType || 'national_id'
  );
  const [idNumber, setIdNumber] = useState(
    currentVerification?.idDocument?.idNumber || existingIdentitySource?.idDocument?.idNumber || ''
  );
  const [idDoc, setIdDoc] = useState<ServiceVerificationDoc | null>(
    currentVerification?.idDocument ? {
      name: currentVerification.idDocument.name,
      type: currentVerification.idDocument.type,
      dataUrl: currentVerification.idDocument.dataUrl,
      size: currentVerification.idDocument.size,
      uploadedAt: currentVerification.idDocument.uploadedAt
    } : existingIdentitySource?.idDocument ? {
      name: existingIdentitySource.idDocument.name,
      type: existingIdentitySource.idDocument.type,
      dataUrl: existingIdentitySource.idDocument.dataUrl,
      size: existingIdentitySource.idDocument.size,
      uploadedAt: existingIdentitySource.idDocument.uploadedAt
    } : null
  );

  // Category 3: Business license / Permit / Academic certification
  const [credentialType, setCredentialType] = useState<'business_permit' | 'academic_cert' | 'professional_license' | 'trade_cert'>(
    currentVerification?.credential?.credentialType || 'business_permit'
  );
  const [docNumber, setDocNumber] = useState(
    currentVerification?.credential?.documentNumber || ''
  );
  const [issuingAuthority, setIssuingAuthority] = useState(
    currentVerification?.credential?.issuingAuthority || ''
  );
  const [credentialDoc, setCredentialDoc] = useState<ServiceVerificationDoc | null>(
    currentVerification?.credential ? {
      name: currentVerification.credential.name,
      type: currentVerification.credential.type,
      dataUrl: currentVerification.credential.dataUrl,
      size: currentVerification.credential.size,
      uploadedAt: currentVerification.credential.uploadedAt
    } : null
  );

  // Fast test mode toggle
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when selected service changes or verification updates
  useEffect(() => {
    if (!service) return;

    if (currentVerification) {
      setSelfieDoc(currentVerification.selfie || existingIdentitySource?.selfie || null);
      setIdDoc(currentVerification.idDocument ? {
        name: currentVerification.idDocument.name,
        type: currentVerification.idDocument.type,
        dataUrl: currentVerification.idDocument.dataUrl,
        size: currentVerification.idDocument.size,
        uploadedAt: currentVerification.idDocument.uploadedAt
      } : existingIdentitySource?.idDocument ? {
        name: existingIdentitySource.idDocument.name,
        type: existingIdentitySource.idDocument.type,
        dataUrl: existingIdentitySource.idDocument.dataUrl,
        size: existingIdentitySource.idDocument.size,
        uploadedAt: existingIdentitySource.idDocument.uploadedAt
      } : null);
      setIdType(currentVerification.idDocument?.idType || existingIdentitySource?.idDocument?.idType || 'national_id');
      setIdNumber(currentVerification.idDocument?.idNumber || existingIdentitySource?.idDocument?.idNumber || '');
      setCredentialType(currentVerification.credential?.credentialType || 'business_permit');
      setDocNumber(currentVerification.credential?.documentNumber || '');
      setIssuingAuthority(currentVerification.credential?.issuingAuthority || '');
      setCredentialDoc(currentVerification.credential ? {
        name: currentVerification.credential.name,
        type: currentVerification.credential.type,
        dataUrl: currentVerification.credential.dataUrl,
        size: currentVerification.credential.size,
        uploadedAt: currentVerification.credential.uploadedAt
      } : null);
      setViewMode(currentVerification.status === 'verified' || currentVerification.status === 'pending' ? 'details' : 'form');
    } else {
      // Brand new service activation: Reuse selfie & ID from existing activated service if present
      if (existingIdentitySource) {
        setSelfieDoc(existingIdentitySource.selfie || null);
        setIdDoc(existingIdentitySource.idDocument ? {
          name: existingIdentitySource.idDocument.name,
          type: existingIdentitySource.idDocument.type,
          dataUrl: existingIdentitySource.idDocument.dataUrl,
          size: existingIdentitySource.idDocument.size,
          uploadedAt: existingIdentitySource.idDocument.uploadedAt
        } : null);
        setIdType(existingIdentitySource.idDocument?.idType || 'national_id');
        setIdNumber(existingIdentitySource.idDocument?.idNumber || '');
      } else {
        setSelfieDoc(null);
        setIdDoc(null);
        setIdType('national_id');
        setIdNumber('');
      }
      setCredentialType('business_permit');
      setDocNumber('');
      setIssuingAuthority('');
      setCredentialDoc(null);
      setViewMode('form');
    }
    setShowIdentityOverride(false);
  }, [service?.id, currentVerification, existingIdentitySource]);

  // Cleanup camera stream
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Launch camera
  const handleStartCamera = async () => {
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Could not access camera:", err);
      toast.error("Camera access not available. You can upload a selfie photo instead.");
      setIsCameraActive(false);
    }
  };

  // Capture from camera video
  const handleCaptureSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    setSelfieDoc({
      name: `selfie_${Date.now()}.jpg`,
      type: 'image/jpeg',
      dataUrl,
      size: Math.round(dataUrl.length * 0.75),
      uploadedAt: new Date().toISOString()
    });

    stopCameraStream();
    toast.success("Selfie photo captured successfully!");
  };

  // Handle Selfie file upload
  const handleSelfieFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImageFile(file, 640, 640, 0.82);
      setSelfieDoc({
        name: file.name,
        type: file.type || 'image/jpeg',
        dataUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
      toast.success("Selfie uploaded successfully!");
    } catch (err) {
      toast.error("Failed to process image. Please try again.");
    }
  };

  // Handle ID file upload
  const handleIdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImageFile(file, 900, 900, 0.85);
      setIdDoc({
        name: file.name,
        type: file.type || 'image/jpeg',
        dataUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
      toast.success("ID document uploaded successfully!");
    } catch (err) {
      toast.error("Failed to process document file.");
    }
  };

  // Handle Credential / Permit file upload
  const handleCredentialFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImageFile(file, 1000, 1000, 0.85);
      setCredentialDoc({
        name: file.name,
        type: file.type || 'image/jpeg',
        dataUrl,
        size: file.size,
        uploadedAt: new Date().toISOString()
      });
      toast.success("Qualification / license document uploaded!");
    } catch (err) {
      toast.error("Failed to process qualification document.");
    }
  };

  // Check category completeness
  const isCategory1Complete = Boolean(selfieDoc);
  const isCategory2Complete = Boolean(idDoc && idNumber.trim().length >= 4);
  const isCategory3Complete = Boolean(credentialDoc && docNumber.trim().length >= 3);
  const isAllComplete = isCategory1Complete && isCategory2Complete && isCategory3Complete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCategory1Complete) {
      toast.error("Please provide Category 1: Selfie photo");
      return;
    }
    if (!isCategory2Complete) {
      toast.error("Please provide Category 2: ID number and document photo/scan");
      return;
    }
    if (!isCategory3Complete) {
      toast.error("Please provide Category 3: Business license, permit, or academic certification");
      return;
    }

    setIsSubmitting(true);
    try {
      const newVerification: ServiceVerification = {
        serviceId: service.id,
        serviceName: service.name,
        categoryGroup,
        // Always reviewed by an admin first (admin site → Verifications).
        status: 'pending',
        submittedAt: new Date().toISOString(),
        selfie: selfieDoc,
        idDocument: idDoc ? {
          ...idDoc,
          idType,
          idNumber: idNumber.trim()
        } : null,
        credential: credentialDoc ? {
          ...credentialDoc,
          credentialType,
          documentNumber: docNumber.trim(),
          issuingAuthority: issuingAuthority.trim() || undefined
        } : null
      };

      await saveServiceVerification(user.uid, newVerification, user);

      toast.success(`Verification submitted for "${service.name}". Our compliance team reviews documents within 24 hours.`);

      onVerificationSaved?.();
      onClose();
    } catch (error) {
      console.error("Failed to save service verification:", error);
      toast.error("Failed to submit verification. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Are you sure you want to pause offering "${service.name}"?`)) return;

    setIsSubmitting(true);
    try {
      await deactivateService(user.uid, service.id, user);
      toast.info(`Service "${service.name}" has been deactivated.`);
      onVerificationSaved?.();
      onClose();
    } catch (err) {
      toast.error("Could not deactivate service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Icon = service.IconComponent;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            stopCameraStream();
            onClose();
          }}
          className="fixed inset-0 bg-rich-black/70 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-warm-gray overflow-hidden my-auto z-10 max-h-[92dvh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-warm-gray bg-primary-bg/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white border border-warm-gray flex items-center justify-center text-accent-gold shadow-sm shrink-0">
                <Icon size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-accent-gold px-2 py-0.5 rounded-md bg-accent-gold/10">
                    {categoryGroup}
                  </span>
                  {isAlreadyVerified && (
                    <span className="text-[10px] uppercase tracking-wider font-black text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-100 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Active
                    </span>
                  )}
                  {isUnderReview && (
                    <span className="text-[10px] uppercase tracking-wider font-black text-amber-700 px-2 py-0.5 rounded-md bg-amber-100 flex items-center gap-1">
                      <Clock size={11} /> Under Review
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-rich-black tracking-tight mt-0.5">
                  {service.name}
                </h2>
              </div>
            </div>

            <button
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="p-2 text-rich-black/50 hover:text-rich-black rounded-full hover:bg-warm-gray/50 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
            {/* View Mode: Details of existing verification */}
            {viewMode === 'details' && currentVerification && (
              <div className="space-y-5">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      {currentVerification.status === 'verified' ? 'Service Verified & Active' : 'Documents Under Review'}
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      {currentVerification.status === 'verified'
                        ? 'Your credentials have been validated. You are eligible to receive instant job requests for this service.'
                        : 'Your documents have been submitted to Task Molly compliance. You will receive an alert once verified.'}
                    </p>
                    {currentVerification.submittedAt && (
                      <p className="text-[10px] text-emerald-700/70 font-semibold mt-1">
                        Submitted: {new Date(currentVerification.submittedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3 Categories Review */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category 1 Summary */}
                  <div className="bg-primary-bg rounded-2xl p-3 border border-warm-gray/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-accent-gold">
                        1. Selfie
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                    {currentVerification.selfie?.dataUrl ? (
                      <img 
                        src={currentVerification.selfie.dataUrl} 
                        alt="Selfie" 
                        className="w-full h-24 object-cover rounded-xl border border-warm-gray"
                      />
                    ) : (
                      <div className="h-24 bg-white rounded-xl border border-dashed border-warm-gray flex items-center justify-center text-xs text-rich-black/40">
                        Selfie on file
                      </div>
                    )}
                    <p className="text-[10px] text-rich-black/60 truncate">
                      {currentVerification.selfie?.name || 'Live Photo'}
                    </p>
                  </div>

                  {/* Category 2 Summary */}
                  <div className="bg-primary-bg rounded-2xl p-3 border border-warm-gray/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-accent-gold">
                        2. Government ID
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                    {currentVerification.idDocument?.dataUrl ? (
                      <img 
                        src={currentVerification.idDocument.dataUrl} 
                        alt="ID" 
                        className="w-full h-24 object-cover rounded-xl border border-warm-gray"
                      />
                    ) : (
                      <div className="h-24 bg-white rounded-xl border border-warm-gray flex flex-col items-center justify-center p-2 text-center">
                        <CreditCard size={20} className="text-accent-gold mb-1" />
                        <span className="text-[11px] font-bold text-rich-black">ID Verified</span>
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-rich-black truncate">
                      No: {currentVerification.idDocument?.idNumber || 'Recorded'}
                    </p>
                  </div>

                  {/* Category 3 Summary */}
                  <div className="bg-primary-bg rounded-2xl p-3 border border-warm-gray/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-accent-gold">
                        3. License / Cert
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    </div>
                    {currentVerification.credential?.dataUrl ? (
                      <img 
                        src={currentVerification.credential.dataUrl} 
                        alt="License" 
                        className="w-full h-24 object-cover rounded-xl border border-warm-gray"
                      />
                    ) : (
                      <div className="h-24 bg-white rounded-xl border border-warm-gray flex flex-col items-center justify-center p-2 text-center">
                        <Award size={20} className="text-accent-gold mb-1" />
                        <span className="text-[11px] font-bold text-rich-black">Permit on file</span>
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-rich-black truncate">
                      {currentVerification.credential?.documentNumber || 'Accredited'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('form')}
                    className="w-full sm:flex-1 py-3 px-4 bg-primary-bg hover:bg-warm-gray/40 border border-warm-gray rounded-xl text-xs font-bold uppercase tracking-wider text-rich-black transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} />
                    <span>Update Documents</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>Deactivate Service</span>
                  </button>
                </div>
              </div>
            )}

            {/* View Mode: Document Upload Form */}
            {viewMode === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ================= IDENTITY ON FILE (STEPS 1 & 2 ALREADY VERIFIED) ================= */}
                {hasExistingIdentity && !showIdentityOverride ? (
                  <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <ShieldCheck size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              Identity Verified
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Steps 1 & 2 on File
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-emerald-950 mt-1">
                            Selfie & Government ID Already Verified
                          </h4>
                          <p className="text-xs text-emerald-800/80 mt-0.5 leading-relaxed">
                            Your identity credentials from your existing service are active and verified. No need to retake a selfie or re-upload your ID.
                          </p>

                          {/* Quick credentials chip */}
                          <div className="mt-3 flex flex-wrap items-center gap-2.5 pt-2 border-t border-emerald-200/60">
                            {selfieDoc?.dataUrl && (
                              <div className="flex items-center gap-2 px-2.5 py-1 bg-white/90 rounded-xl border border-emerald-200 shadow-2xs">
                                <img 
                                  src={selfieDoc.dataUrl} 
                                  alt="Selfie" 
                                  className="w-5 h-5 rounded-full object-cover border border-emerald-300"
                                />
                                <span className="text-[11px] font-bold text-emerald-900">Selfie on File</span>
                              </div>
                            )}
                            {idNumber && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/90 rounded-xl border border-emerald-200 shadow-2xs text-[11px] font-bold text-emerald-900">
                                <CreditCard size={13} className="text-emerald-600" />
                                <span>
                                  {idType === 'national_id' ? 'National ID' : idType === 'passport' ? 'Passport' : 'Alien Card'}: {idNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowIdentityOverride(true)}
                        className="text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-950 underline underline-offset-2 shrink-0 py-1 px-2 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Update ID
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Optional banner when overriding on-file identity */}
                    {showIdentityOverride && hasExistingIdentity && (
                      <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                        <span>Updating identity details for this service</span>
                        <button
                          type="button"
                          onClick={() => setShowIdentityOverride(false)}
                          className="text-amber-800 font-bold hover:underline cursor-pointer"
                        >
                          Use on-file identity
                        </button>
                      </div>
                    )}

                    {/* ================= CATEGORY 1: SELFIE ================= */}
                    <div className="border border-warm-gray rounded-2xl p-4 bg-white space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-warm-gray/40">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent-gold text-white font-black text-xs flex items-center justify-center shrink-0">
                            1
                          </div>
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-rich-black">
                              Category 1: Selfie
                            </h3>
                            <p className="text-[11px] text-rich-black/50">
                              Clear front-facing portrait photo in good lighting (no hats or sunglasses)
                            </p>
                          </div>
                        </div>
                        {isCategory1Complete && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={12} /> Ready
                          </span>
                        )}
                      </div>

                      {/* Active Camera View */}
                      {isCameraActive ? (
                        <div className="space-y-3">
                          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-sm mx-auto flex items-center justify-center">
                            <video 
                              ref={videoRef} 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-2xl pointer-events-none" />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleCaptureSelfie}
                              className="px-5 py-2 bg-accent-gold text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:bg-accent-gold/90 transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Camera size={15} />
                              <span>Snap Photo</span>
                            </button>
                            <button
                              type="button"
                              onClick={stopCameraStream}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-rich-black/70 rounded-full text-xs font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : selfieDoc ? (
                        /* Captured / Uploaded Selfie Preview */
                        <div className="flex items-center gap-4 p-3 bg-primary-bg rounded-xl border border-warm-gray">
                          {selfieDoc.dataUrl ? (
                            <img 
                              src={selfieDoc.dataUrl} 
                              alt="Selfie preview" 
                              className="w-16 h-16 rounded-xl object-cover border border-warm-gray shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-accent-gold/10 flex items-center justify-center text-accent-gold shrink-0">
                              <Camera size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-rich-black truncate">{selfieDoc.name}</p>
                            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              <CheckCircle2 size={12} /> Selfie verified & attached
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelfieDoc(null)}
                            className="p-2 text-rich-black/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove photo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        /* Choose Camera or Upload */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={handleStartCamera}
                            className="p-4 rounded-xl border border-dashed border-accent-gold/60 bg-accent-gold/5 hover:bg-accent-gold/10 transition-colors flex items-center justify-center gap-2 text-accent-gold font-bold text-xs cursor-pointer"
                          >
                            <Camera size={18} />
                            <span>Take Selfie with Camera</span>
                          </button>

                          <label className="p-4 rounded-xl border border-dashed border-warm-gray hover:border-accent-gold bg-white hover:bg-primary-bg transition-colors flex items-center justify-center gap-2 text-rich-black/70 font-bold text-xs cursor-pointer">
                            <Upload size={18} className="text-accent-gold" />
                            <span>Upload Photo File</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="user"
                              onChange={handleSelfieFileUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* ================= CATEGORY 2: ID ================= */}
                    <div className="border border-warm-gray rounded-2xl p-4 bg-white space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-warm-gray/40">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent-gold text-white font-black text-xs flex items-center justify-center shrink-0">
                            2
                          </div>
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-rich-black">
                              Category 2: ID
                            </h3>
                            <p className="text-[11px] text-rich-black/50">
                              Kenyan National ID (Kitambulisho), Passport, or Alien Registration Card
                            </p>
                          </div>
                        </div>
                        {isCategory2Complete && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={12} /> Ready
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-rich-black/60 mb-1">
                            ID Document Type
                          </label>
                          <select
                            value={idType}
                            onChange={(e: any) => setIdType(e.target.value)}
                            className="w-full px-3 py-2 bg-primary-bg border border-warm-gray rounded-xl text-xs font-semibold text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
                          >
                            <option value="national_id">Kenyan National ID (Kitambulisho)</option>
                            <option value="passport">Kenyan Passport</option>
                            <option value="alien_card">Military ID / Alien Registration</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-rich-black/60 mb-1">
                            ID / Document Number *
                          </label>
                          <input
                            type="text"
                            value={idNumber}
                            onChange={(e) => setIdNumber(e.target.value)}
                            placeholder="e.g. 28491028"
                            className="w-full px-3 py-2 bg-primary-bg border border-warm-gray rounded-xl text-xs font-semibold text-rich-black placeholder:text-rich-black/30 focus:outline-none focus:border-accent-gold"
                          />
                        </div>
                      </div>

                      {/* ID File Upload / Preview */}
                      {idDoc ? (
                        <div className="flex items-center gap-3 p-3 bg-primary-bg rounded-xl border border-warm-gray">
                          {idDoc.dataUrl ? (
                            <img 
                              src={idDoc.dataUrl} 
                              alt="ID Document" 
                              className="w-14 h-14 rounded-lg object-cover border border-warm-gray shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-white border border-warm-gray flex items-center justify-center text-accent-gold shrink-0">
                              <CreditCard size={20} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-rich-black truncate">{idDoc.name}</p>
                            <p className="text-[10px] text-rich-black/50">
                              {(idDoc.size ? (idDoc.size / 1024).toFixed(0) + ' KB' : 'Document attached')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIdDoc(null)}
                            className="p-2 text-rich-black/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="p-3.5 rounded-xl border border-dashed border-warm-gray hover:border-accent-gold bg-primary-bg/50 hover:bg-primary-bg transition-colors flex items-center justify-center gap-2 text-rich-black/70 font-bold text-xs cursor-pointer">
                          <Upload size={16} className="text-accent-gold" />
                          <span>Upload Front & Back of ID (Photo / PDF)</span>
                          <input 
                            type="file" 
                            accept="image/*,application/pdf" 
                            onChange={handleIdFileUpload} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}

                {/* ================= CATEGORY 3: BUSINESS LICENSE / PERMIT / ACADEMIC CERT ================= */}
                <div className={`border rounded-2xl p-4 bg-white space-y-3.5 shadow-2xs transition-all ${
                  hasExistingIdentity && !showIdentityOverride ? 'border-accent-gold/80 ring-2 ring-accent-gold/15' : 'border-warm-gray'
                }`}>
                  <div className="flex items-center justify-between pb-2 border-b border-warm-gray/40">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent-gold text-white font-black text-xs flex items-center justify-center shrink-0">
                        3
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-rich-black">
                            Category 3: Business license/permit/academic certification
                          </h3>
                          {hasExistingIdentity && !showIdentityOverride && (
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded-full">
                              Required for {service.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-rich-black/50">
                          {hasExistingIdentity && !showIdentityOverride 
                            ? 'Upload only your business license, single business permit, or academic/trade certification for this service'
                            : 'County business permit, TVET/NITA certificate, or professional accreditation'}
                        </p>
                      </div>
                    </div>
                    {isCategory3Complete && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={12} /> Ready
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rich-black/60 mb-1">
                      Certification / Permit Category
                    </label>
                    <select
                      value={credentialType}
                      onChange={(e: any) => setCredentialType(e.target.value)}
                      className="w-full px-3 py-2 bg-primary-bg border border-warm-gray rounded-xl text-xs font-semibold text-rich-black focus:outline-none focus:border-accent-gold cursor-pointer"
                    >
                      <option value="business_permit">County Government Single Business Permit (SBP)</option>
                      <option value="academic_cert">Academic / Vocational Certificate (TVET, NITA, KNEC, College/Univ)</option>
                      <option value="professional_license">Professional Regulatory License (EPRA, NCA, Public Health, etc.)</option>
                      <option value="trade_cert">Apprenticeship / Specialized Trade Accreditation</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rich-black/60 mb-1">
                        Permit / Certificate Number *
                      </label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        placeholder="e.g. SBP/NBI/2025/1049"
                        className="w-full px-3 py-2 bg-primary-bg border border-warm-gray rounded-xl text-xs font-semibold text-rich-black placeholder:text-rich-black/30 focus:outline-none focus:border-accent-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-rich-black/60 mb-1">
                        Issuing Authority / Institution
                      </label>
                      <input
                        type="text"
                        value={issuingAuthority}
                        onChange={(e) => setIssuingAuthority(e.target.value)}
                        placeholder="e.g. Nairobi City County / NITA"
                        className="w-full px-3 py-2 bg-primary-bg border border-warm-gray rounded-xl text-xs font-semibold text-rich-black placeholder:text-rich-black/30 focus:outline-none focus:border-accent-gold"
                      />
                    </div>
                  </div>

                  {/* Credential File Upload / Preview */}
                  {credentialDoc ? (
                    <div className="flex items-center gap-3 p-3 bg-primary-bg rounded-xl border border-warm-gray">
                      {credentialDoc.dataUrl && credentialDoc.type.startsWith('image/') ? (
                        <img 
                          src={credentialDoc.dataUrl} 
                          alt="Credential Document" 
                          className="w-14 h-14 rounded-lg object-cover border border-warm-gray shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-white border border-warm-gray flex items-center justify-center text-accent-gold shrink-0">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-rich-black truncate">{credentialDoc.name}</p>
                        <p className="text-[10px] text-rich-black/50">
                          {(credentialDoc.size ? (credentialDoc.size / 1024).toFixed(0) + ' KB' : 'File attached')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCredentialDoc(null)}
                        className="p-2 text-rich-black/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="p-3.5 rounded-xl border border-dashed border-warm-gray hover:border-accent-gold bg-primary-bg/50 hover:bg-primary-bg transition-colors flex items-center justify-center gap-2 text-rich-black/70 font-bold text-xs cursor-pointer">
                      <Upload size={16} className="text-accent-gold" />
                      <span>Upload Permit / Academic Certificate / License File</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={handleCredentialFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  {currentVerification && (
                    <button
                      type="button"
                      onClick={() => setViewMode('details')}
                      className="px-4 py-3 rounded-full border border-warm-gray text-xs font-bold uppercase tracking-wider text-rich-black/60 hover:text-rich-black transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!isAllComplete || isSubmitting}
                    className="flex-1 sm:flex-none px-6 py-3 bg-rich-black hover:bg-black text-white hover:text-accent-gold border border-rich-black rounded-full text-xs font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck size={16} className="text-accent-gold" />
                    <span>
                      {isSubmitting ? 'Saving...' : 'Submit for Verification'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
