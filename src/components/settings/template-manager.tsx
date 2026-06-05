'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  ExternalLink, 
  Phone 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MessageTemplate } from '@/types';

const CATEGORIES = ['Marketing', 'Utility', 'Authentication'] as const;
const HEADER_TYPES = ['text', 'image', 'video', 'document'] as const;

const categoryColors: Record<string, string> = {
  Marketing: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  Utility: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  Authentication: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
};

const statusColors: Record<string, string> = {
  Draft: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  Pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  Approved: 'bg-violet-600/20 text-violet-400 border-violet-600/30',
  Rejected: 'bg-red-600/20 text-red-400 border-red-600/30',
};

interface TemplateButton {
  type: 'quick_reply' | 'url' | 'phone';
  text: string;
  value: string;
}

interface TemplateFormData {
  name: string;
  category: MessageTemplate['category'];
  language: string;
  body_text: string;
  header_type: string;
  header_text: string;         // For text-type header
  header_media_url: string;    // For image/video/document media-type header
  footer_text: string;
  buttons: TemplateButton[];   // ডাইনামিক বাটনসমূহ
}

const emptyForm: TemplateFormData = {
  name: '',
  category: 'Marketing',
  language: 'en_US',
  body_text: '',
  header_type: 'none',
  header_text: '',
  header_media_url: '',
  footer_text: '',
  buttons: [],
};

const COMMON_LANGUAGE_CODES = [
  'bn',    // বাংলা (Bangladesh)
  'en_US', // English (US)
  'en_GB', // English (UK)
];

export function TemplateManager() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);

  // বাটন ফর্ম ম্যানেজমেন্ট লোকাল স্টেট
  const [btnType, setBtnType] = useState<'quick_reply' | 'url' | 'phone'>('quick_reply');
  const [btnText, setBtnText] = useState('');
  const [btnValue, setBtnValue] = useState('');

  // ডাইনামিক টাইমস্ট্যাম্প স্টেট
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setCurrentTime(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
  }, [dialogOpen]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchTemplates(user.id);
  }, [authLoading, user?.id]);

  async function fetchTemplates(userId: string) {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    if (!form.body_text.trim()) {
      toast.error('Body text is required');
      return;
    }

    // Header Content Validation based on Header Type
    let finalHeaderContent: string | null = null;
    if (form.header_type === 'text') {
      if (!form.header_text.trim()) {
        toast.error('Header text is required');
        return;
      }
      finalHeaderContent = form.header_text.trim();
    } else if (['image', 'video', 'document'].includes(form.header_type as string)) {
      if (!form.header_media_url.trim()) {
        toast.error(`Please upload a sample ${form.header_type} or provide a media URL`);
        return;
      }
      finalHeaderContent = form.header_media_url.trim();
    }

    try {
      setSaving(true);
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // সুপাবেসে সরাসরি ইনসার্ট না করে আমাদের নতুন মেটা সাবমিশন এপিআই কল করা হচ্ছে
      const res = await fetch('/api/whatsapp/templates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          language: form.language.trim() || 'en_US',
          body_text: form.body_text.trim(),
          header_type: form.header_type,
          header_content: finalHeaderContent,
          footer_text: form.footer_text.trim() || null,
          buttons: form.buttons,
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData?.error || `HTTP ${res.status}`);
      }

      toast.success('Template submitted to Meta and saved successfully!');
      setDialogOpen(false);
      setForm(emptyForm);
      if (user) await fetchTemplates(user.id);
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      toast.loading(`Uploading sample ${form.header_type}...`);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('templates')
        .getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, header_media_url: publicUrl }));
      toast.dismiss();
      toast.success('Sample media uploaded successfully');
    } catch (err) {
      console.error('Media upload error:', err);
      toast.dismiss();
      toast.error('Upload failed. Ensure the storage bucket "templates" exists.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSyncFromMeta() {
    if (!user) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/whatsapp/templates/sync', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Sync failed (HTTP ${res.status})`);
      }
      toast.success(
        `Synced ${data.total} template${data.total === 1 ? '' : 's'} from Meta` +
          (data.inserted || data.updated
            ? ` (${data.inserted} new, ${data.updated} updated)`
            : ''),
      );
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const preview = data.errors.slice(0, 3).map(
          (e: { name: string; language: string; message: string }) =>
            `${e.name} (${e.language})`,
        );
        const suffix = data.errors.length > 3 ? `, +${data.errors.length - 3} more` : '';
        toast.error(`Failed to sync: ${preview.join(', ')}${suffix}`);
      }
      if (data.truncated) {
        toast.warning('Hit Meta pagination cap — more templates may exist.');
      }
      await fetchTemplates(user.id);
    } catch (err) {
      console.error('Template sync error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to sync templates');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete template');
    }
  }

  const getHeaderIcon = (type?: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="size-4 text-violet-400" />;
      case 'video': return <Video className="size-4 text-emerald-400" />;
      case 'document': return <FileText className="size-4 text-blue-400" />;
      default: return null;
    }
  };

  const handleAddButton = () => {
    if (form.buttons.length >= 3) {
      toast.error('Meta restricts templates to a maximum of 3 buttons.');
      return;
    }
    if (!btnText.trim()) {
      toast.error('Button text cannot be empty.');
      return;
    }
    if (btnType !== 'quick_reply' && !btnValue.trim()) {
      toast.error('URL link or Phone number is required for CTA buttons.');
      return;
    }

    const newBtn: TemplateButton = {
      type: btnType,
      text: btnText.trim(),
      value: btnType === 'quick_reply' ? '' : btnValue.trim()
    };

    setForm((prev) => ({
      ...prev,
      buttons: [...prev.buttons, newBtn]
    }));

    setBtnText('');
    setBtnValue('');
  };

  const handleRemoveButton = (index: number) => {
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, idx) => idx !== index)
    }));
  };

  // লাইভ প্রিভিউতে ভেরিয়েবল হাইলাইট করার Regex ফাংশন
  const formatBodyVariables = (text: string) => {
    if (!text) return <span className="text-slate-600">{'Enter template body text...'}</span>;
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, index) => {
      if (part.match(/\{\{\d+\}\}/)) {
        return (
          <span key={index} className="inline-block px-1 py-0.5 rounded text-[11px] font-bold font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white">Message Templates</h2>
          <p className="text-sm text-slate-400">
            Create and manage your WhatsApp message templates. Meta requires
            every template to be approved in the WhatsApp Manager before it can
            be sent — use &quot;Sync from Meta&quot; to pull your approved list.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSyncFromMeta}
            disabled={syncing}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
            title="Pull approved templates from your Meta WhatsApp Business Account"
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Meta'}
          </Button>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setDialogOpen(true);
            }}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="size-4" />
            New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-slate-400 text-sm">No templates yet.</p>
            <p className="text-slate-500 text-xs mt-1">Create your first message template to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id} className="bg-slate-900 border-slate-700 ring-0 ring-transparent">
              <CardContent className="flex items-start justify-between pt-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-white">{template.name}</h3>
                    <Badge className={`text-xs border ${categoryColors[template.category] || ''}`}>
                      {template.category}
                    </Badge>
                    <Badge className={`text-xs border ${statusColors[template.status || 'Draft'] || ''}`}>
                      {template.status || 'Draft'}
                    </Badge>
                    {template.header_type && (template.header_type as string) !== 'none' && (
                      <Badge variant="outline" className="text-xs border-slate-700 text-slate-300 flex items-center gap-1 bg-slate-800/40">
                        {getHeaderIcon(template.header_type)}
                        <span className="capitalize">{template.header_type}</span>
                      </Badge>
                    )}
                    {template.language && (
                      <span className="text-xs text-slate-500 uppercase">{template.language}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{template.body_text}</p>
                  {template.footer_text && (
                    <p className="text-xs text-slate-500 italic">{template.footer_text}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(template.id)}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-950/30 shrink-0 ml-2"
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Template Dialog (2-Column Responsive Layout) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 md:max-w-4xl flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0 pb-2 border-b border-slate-800/60">
            <DialogTitle className="text-white">New Message Template</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new WhatsApp message template.
            </DialogDescription>
          </DialogHeader>

          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden h-full py-2">
            
            {/* LEFT COLUMN: Input Fields Form */}
            <div className="md:col-span-7 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 h-full">
              <div className="space-y-2">
                <Label className="text-slate-300">Template Name</Label>
                <Input
                  placeholder="e.g. order_confirmation"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) =>
                      setForm({ ...form, category: val as MessageTemplate['category'] })
                    }
                  >
                    <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-white focus:bg-slate-700 focus:text-white">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Language</Label>
                  <Input
                    list="template-language-codes"
                    placeholder="en_US"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                  <datalist id="template-language-codes">
                    {COMMON_LANGUAGE_CODES.map((code) => (
                      <option key={code} value={code} />
                    ))}
                  </datalist>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Must match the exact language code — e.g. <code>en_US</code> and <code>en</code> are distinct.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Header Type</Label>
                <Select
                  value={form.header_type}
                  onValueChange={(val) => setForm({ ...form, header_type: val || 'none' })}
                >
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-white focus:bg-slate-700 focus:text-white">
                      None
                    </SelectItem>
                    {HEADER_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="text-white focus:bg-slate-700 focus:text-white">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CASE 1: TEXT HEADER INPUT */}
              {form.header_type === 'text' && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Header Text</Label>
                  <Input
                    placeholder="Enter header text (e.g. Welcome to our shop)"
                    value={form.header_text}
                    onChange={(e) => setForm({ ...form, header_text: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* CASE 2: DYNAMIC MEDIA UPLOADER */}
              {['image', 'video', 'document'].includes(form.header_type as string) && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    {getHeaderIcon(form.header_type)}
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      {form.header_type} Sample attachment
                    </Label>
                  </div>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Media Public URL</Label>
                      <Input
                        type="text"
                        placeholder={`Paste sample ${form.header_type} direct URL`}
                        value={form.header_media_url}
                        onChange={(e) => setForm({ ...form, header_media_url: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white text-xs placeholder:text-slate-600 h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-400">Or Upload File</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept={
                            form.header_type === 'image'
                              ? 'image/*'
                              : form.header_type === 'video'
                              ? 'video/*'
                              : '.pdf,.doc,.docx'
                          }
                          disabled={uploading}
                          onChange={handleFileUpload}
                          className="bg-slate-800 border-slate-700 text-white text-xs cursor-pointer h-9 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Body Text</Label>
                <Textarea
                  placeholder="Enter your template message body. Use {{1}}, {{2}} for variables."
                  value={form.body_text}
                  onChange={(e) => setForm({ ...form, body_text: e.target.value })}
                  rows={4}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Footer Text</Label>
                <Input
                  placeholder="Optional footer text"
                  value={form.footer_text}
                  onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              {/* DYNAMIC INTERACTIVE BUTTONS BUILDER */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
                  {'Interactive Buttons (Maximum 3)'}
                </Label>
                
                {/* Active Button List */}
                {form.buttons.length > 0 && (
                  <div className="space-y-2">
                    {form.buttons.map((btn, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="flex items-center gap-2 text-xs">
                          {btn.type === 'quick_reply' && <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/20 bg-amber-400/5">{'Quick Reply'}</Badge>}
                          {btn.type === 'url' && <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/20 bg-blue-400/5">{'CTA URL'}</Badge>}
                          {btn.type === 'phone' && <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/5">{'CTA Call'}</Badge>}
                          <span className="font-semibold text-white">{btn.text}</span>
                          {btn.value && <span className="text-slate-500 truncate max-w-[150px] font-mono text-[10px]">{`(${btn.value})`}</span>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveButton(index)}
                          className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Fields to Add a New Button */}
                {form.buttons.length < 3 && (
                  <div className="space-y-3 pt-2 border-t border-slate-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Button Type</Label>
                        <Select
                          value={btnType}
                          onValueChange={(val) => {
                            setBtnType(val as 'quick_reply' | 'url' | 'phone');
                            setBtnValue('');
                          }}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-800 text-white text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-850">
                            <SelectItem value="quick_reply" className="text-white text-xs focus:bg-slate-800">Quick Reply</SelectItem>
                            <SelectItem value="url" className="text-white text-xs focus:bg-slate-800">Call to Action (URL)</SelectItem>
                            <SelectItem value="phone" className="text-white text-xs focus:bg-slate-800">Call to Action (Phone)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Button Label (Max 25 chars)</Label>
                        <Input
                          placeholder="e.g. Visit Website"
                          value={btnText}
                          onChange={(e) => setBtnText(e.target.value.slice(0, 25))}
                          className="bg-slate-900 border-slate-800 text-white text-xs h-9"
                        />
                      </div>
                    </div>

                    {btnType !== 'quick_reply' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">
                          {btnType === 'url' ? 'Target URL (e.g. https://...)' : 'Phone Number (e.g. +88019...)'}
                        </Label>
                        <Input
                          placeholder={btnType === 'url' ? 'https://yourdomain.com/checkout' : '+8801903042944'}
                          value={btnValue}
                          onChange={(e) => setBtnValue(e.target.value)}
                          className="bg-slate-900 border-slate-800 text-white text-xs h-9"
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddButton}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs py-1 h-8 mt-1 w-full sm:w-auto"
                    >
                      <Plus className="size-3.5 mr-1" /> Add Button
                    </Button>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: WhatsApp Real-Life Dark-Mode Mockup Preview */}
            <div className="md:col-span-5 h-full flex flex-col justify-start bg-[#0b141a] rounded-2xl border border-slate-800 overflow-hidden relative">
              {/* WhatsApp Chat Header Mockup */}
              <div className="bg-[#202c33] p-3 flex items-center gap-2.5 border-b border-[#2e3b43]">
                <div className="size-8 rounded-full bg-[#6a7175] flex items-center justify-center text-white font-extrabold text-xs">
                  {'AC'}
                </div>
                <div className="leading-none">
                  <h4 className="text-[13px] font-bold text-[#e9edef]">{'amarchat Workspace'}</h4>
                  <span className="text-[9px] text-[#00a884] font-medium block mt-0.5 animate-pulse">{'online'}</span>
                </div>
              </div>

              {/* WhatsApp Message Area (Wallpaper style) */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col justify-start min-h-0 bg-[#0b141a] relative">
                
                {/* Real-life WhatsApp Incoming Bubble */}
                <div className="self-start relative bg-[#202c33] text-[#e9edef] rounded-xl rounded-tl-none p-3 shadow-md max-w-[85%] min-w-[200px]">
                  
                  {/* Bubble Tail */}
                  <div className="absolute top-0 -left-1.5 w-0 h-0 border-t-[8px] border-t-[#202c33] border-l-[8px] border-l-transparent" />
                  
                  {/* Media Header Preview */}
                  {['image', 'video', 'document'].includes(form.header_type as string) && (
                    <div className="rounded-lg overflow-hidden bg-[#101a20] aspect-video relative border border-[#2a3942] mb-2 flex items-center justify-center">
                      {form.header_type === 'image' && form.header_media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={form.header_media_url} 
                          alt="Live WhatsApp Preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[#8696a0]">
                          {form.header_type === 'image' && <ImageIcon className="size-8" />}
                          {form.header_type === 'video' && <Video className="size-8" />}
                          {form.header_type === 'document' && <FileText className="size-8" />}
                          <span className="text-[10px] font-medium capitalize">{`${form.header_type} sample`}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text Header Preview */}
                  {form.header_type === 'text' && form.header_text && (
                    <h5 className="text-xs font-extrabold text-[#e9edef] leading-normal mb-1.5 break-words">
                      {form.header_text}
                    </h5>
                  )}

                  {/* Body Text (with dynamic variables highlighter) */}
                  <p className="text-xs leading-relaxed text-[#e9edef] break-words">
                    {formatBodyVariables(form.body_text)}
                  </p>

                  {/* Optional Footer Text */}
                  {form.footer_text && (
                    <p className="text-[10px] text-[#8696a0] mt-1.5 font-medium leading-tight">
                      {form.footer_text}
                    </p>
                  )}

                  {/* Timestamp aligned on bottom right */}
                  <div className="text-right mt-1.5">
                    <span className="text-[9px] text-[#8696a0] tabular-nums font-medium">
                      {currentTime}
                    </span>
                  </div>
                </div>

                {/* Interactive Action Buttons Attached under the bubble */}
                {form.buttons.length > 0 && (
                  <div className="self-start max-w-[85%] min-w-[200px] -mt-1.5 space-y-[1px] overflow-hidden rounded-b-xl">
                    {form.buttons.map((btn, index) => (
                      <div 
                        key={index} 
                        className="bg-[#202c33] hover:bg-[#2a3942] active:bg-[#2e3b43] transition-colors py-2 px-3 text-center text-xs font-semibold text-[#53bdeb] flex items-center justify-center gap-1.5 cursor-pointer border-t border-[#2a3942]"
                      >
                        {btn.type === 'url' && <ExternalLink className="size-3" />}
                        {btn.type === 'phone' && <Phone className="size-3" />}
                        {btn.text}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-slate-800/60 bg-slate-900">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}