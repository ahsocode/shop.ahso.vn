"use client";

import { type ChangeEvent, type FormEvent, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle,
  Clock,
  Facebook,
  Globe,
  Headphones,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  User,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormData = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  message: string;
};

const initialFormData: FormData = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  subject: "",
  message: "",
};

const subjectOptions = [
  { value: "", label: "Chọn chủ đề" },
  { value: "product", label: "Tư vấn giải pháp/phần mềm" },
  { value: "quote", label: "Yêu cầu báo giá" },
  { value: "support", label: "Hỗ trợ kỹ thuật" },
  { value: "partnership", label: "Hợp tác kinh doanh" },
  { value: "other", label: "Khác" },
] as const;

const contactInfo = [
  {
    icon: Phone,
    title: "Điện thoại",
    content: "0901 951 351",
    subContent: "Thứ 2 - Thứ 7: 8:00 - 18:00",
    href: "tel:+84901951351",
  },
  {
    icon: Mail,
    title: "Email",
    content: "sales@ahso.vn",
    subContent: "Phản hồi trong 24h",
    href: "mailto:sales@ahso.vn",
  },
  {
    icon: MapPin,
    title: "Địa chỉ",
    content: "39/15 Cao Bá Quát, Khu Phố Đông Tân, Dĩ An, TP.HCM",
    subContent: "TP. Hồ Chí Minh, Việt Nam",
    href: "https://maps.app.goo.gl/VteyBSCYdoptCoVk6",
  },
  {
    icon: Clock,
    title: "Giờ làm việc",
    content: "Thứ 2 - Thứ 6: 8:00 - 17:30",
    subContent: "Thứ 7: 8:00 - 12:00",
    href: "#contact-form",
  },
] as const;

const contactTones = [
  {
    card: "border-blue-200 bg-blue-50/70 hover:border-blue-400",
    icon: "bg-blue-700 text-white",
    bar: "bg-blue-700",
  },
  {
    card: "border-emerald-200 bg-emerald-50/70 hover:border-emerald-400",
    icon: "bg-emerald-700 text-white",
    bar: "bg-emerald-700",
  },
  {
    card: "border-amber-200 bg-amber-50/80 hover:border-amber-400",
    icon: "bg-amber-600 text-white",
    bar: "bg-amber-500",
  },
  {
    card: "border-slate-200 bg-slate-50/80 hover:border-slate-400",
    icon: "bg-slate-800 text-white",
    bar: "bg-slate-800",
  },
] as const;

const supportReasons = [
  { icon: Headphones, text: "Tư vấn miễn phí từ chuyên gia" },
  { icon: CheckCircle, text: "Báo giá nhanh trong 24h" },
  { icon: MessageSquare, text: "Trao đổi rõ nhu cầu và phương án" },
  { icon: Phone, text: "Hỗ trợ kỹ thuật theo từng trường hợp" },
] as const;

const socialLinks = [
  { icon: Facebook, name: "Facebook", href: "https://www.facebook.com/profile.php?id=61576136387582" },
  { icon: Linkedin, name: "LinkedIn", href: "#" },
  { icon: Youtube, name: "YouTube", href: "#" },
  { icon: Globe, name: "Website", href: "#" },
] as const;

const faqs = [
  {
    question: "Thời gian phản hồi là bao lâu?",
    answer:
      "Chúng tôi phản hồi trong vòng 24 giờ làm việc. Với yêu cầu khẩn cấp, vui lòng gọi hotline để được hỗ trợ nhanh hơn.",
  },
  {
    question: "Tôi có thể yêu cầu báo giá trực tiếp không?",
    answer:
      "Có. Bạn chọn chủ đề “Yêu cầu báo giá” và mô tả rõ sản phẩm hoặc nhu cầu. AHSO sẽ liên hệ lại để xác nhận thông tin và gửi báo giá phù hợp.",
  },
  {
    question: "AHSO có hỗ trợ tư vấn kỹ thuật không?",
    answer:
      "Có. Đội ngũ kỹ thuật của AHSO có thể tư vấn giải pháp, thiết bị và phương án triển khai phù hợp với nhu cầu vận hành.",
  },
  {
    question: "Tôi muốn đến trực tiếp văn phòng, có cần hẹn trước không?",
    answer:
      "Bạn nên đặt lịch trước qua hotline hoặc email để AHSO sắp xếp người phụ trách phù hợp và chuẩn bị thông tin cần thiết.",
  },
] as const;

const mapsAddress = "Công ty TNHH AHSO 39/15 Cao Bá Quát, Khu Phố Đông Tân, Dĩ An, TP.HCM";
const mapsEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapsAddress)}&output=embed`;
const mapsUrl = "https://maps.app.goo.gl/VteyBSCYdoptCoVk6";

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setIsSuccess(false);

    const message =
      formData.message.trim().length >= 10
        ? formData.message.trim()
        : "Khách hàng không để lại nội dung. Vui lòng liên hệ để trao đổi thêm.";

    const payload = {
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      company: formData.company.trim() || undefined,
      subject: formData.subject.trim() || undefined,
      message,
    };

    if (!payload.fullName) {
      toast.warning("Vui lòng nhập họ và tên.");
      setIsSubmitting(false);
      return;
    }

    if (!payload.phone || payload.phone.replace(/[^0-9]/g, "").length < 9) {
      toast.warning("Vui lòng nhập số điện thoại tối thiểu 9 chữ số để chúng tôi liên hệ.");
      setIsSubmitting(false);
      return;
    }

    const toastId = toast.loading("Đang gửi thông tin liên hệ...");

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as
          | { message?: string; error?: string; issues?: Array<{ message?: string; path?: string[] }> }
          | null;
        const validationMessage =
          errorData?.issues && errorData.issues.length
            ? errorData.issues[0]?.message || "Thông tin chưa hợp lệ."
            : null;
        throw new Error(
          validationMessage ||
            errorData?.message ||
            errorData?.error ||
            `Gửi liên hệ thất bại (${res.status})`,
        );
      }

      setIsSuccess(true);
      setFormData(initialFormData);
      toast.success("Đã gửi thông tin. AHSO sẽ phản hồi trong thời gian sớm nhất.", { id: toastId });
      window.setTimeout(() => setIsSuccess(false), 2500);
    } catch (error) {
      console.error("Send contact failed:", error);
      toast.error(error instanceof Error ? error.message : "Không thể gửi liên hệ. Vui lòng thử lại sau.", {
        id: toastId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f2] text-gray-950">
      <section className="relative overflow-hidden border-b border-gray-200 bg-white">
        <div className="absolute left-0 top-0 hidden h-full w-2 bg-emerald-700 md:block" />
        <div className="absolute bottom-0 right-0 hidden h-20 w-80 bg-amber-100 lg:block" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              <Headphones className="h-4 w-4" />
              Hỗ trợ khách hàng
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight text-gray-950 md:text-4xl">
              Liên hệ với AHSO
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 md:text-base">
              Đội ngũ AHSO sẵn sàng tư vấn sản phẩm, hỗ trợ kỹ thuật và trao đổi phương án phù hợp với nhu cầu vận hành của bạn.
            </p>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Tư vấn rõ nhu cầu", "Báo giá trong 24h", "Hỗ trợ kỹ thuật"].map((item) => (
                <div key={item} className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm font-semibold text-gray-800">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-md border border-slate-800 bg-slate-900 p-5 text-white">
            <div className="absolute left-0 top-0 h-1 w-full bg-amber-400" />
            <p className="text-sm font-semibold">Cần trao đổi nhanh?</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Gọi hotline hoặc gửi form bên dưới. Những yêu cầu có đầy đủ số điện thoại và nội dung sẽ được xử lý nhanh hơn.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="tel:+84901951351"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
              >
                <Phone className="h-4 w-4" />
                Gọi AHSO
              </Link>
              <Link
                href="mailto:sales@ahso.vn"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/25 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                <Mail className="h-4 w-4" />
                Gửi email
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {contactInfo.map((info, index) => {
            const Icon = info.icon;
            const tone = contactTones[index % contactTones.length];
            return (
              <a
                key={info.title}
                href={info.href}
                className={cn("relative overflow-hidden rounded-md border p-4 transition-colors", tone.card)}
                target={info.href.startsWith("http") ? "_blank" : undefined}
                rel={info.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <div className={cn("absolute left-0 top-0 h-full w-1", tone.bar)} />
                <div className="flex items-start gap-3">
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", tone.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-gray-950">{info.title}</h2>
                    <p className="mt-1 text-sm font-semibold leading-5 text-gray-800">{info.content}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{info.subContent}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <Card id="contact-form" className="overflow-hidden rounded-md border-gray-200 shadow-none">
          <CardHeader className="border-b border-gray-200 bg-white">
            <div className="mb-1 h-1.5 w-16 bg-blue-700" />
            <CardTitle>Gửi thông tin liên hệ</CardTitle>
            <p className="text-sm leading-6 text-gray-600">
              Điền thông tin bên dưới để AHSO liên hệ lại và tư vấn chi tiết.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Họ và tên" required icon={User}>
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                    required
                  />
                </Field>

                <Field label="Số điện thoại" required icon={Phone}>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0123 456 789"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                    type="tel"
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email" icon={Mail}>
                  <Input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    autoComplete="email"
                    type="email"
                  />
                </Field>

                <Field label="Tên công ty" icon={Building2}>
                  <Input
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Công ty TNHH..."
                    autoComplete="organization"
                  />
                </Field>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Chủ đề</Label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                >
                  {subjectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="message">Nội dung</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={7}
                  placeholder="Mô tả nhu cầu, sản phẩm cần tư vấn hoặc thông tin cần báo giá..."
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-gray-500">
                  Bằng cách gửi thông tin, bạn đồng ý với{" "}
                  <Link href="/policy" className="font-semibold text-blue-700 hover:underline">
                    chính sách bảo mật
                  </Link>{" "}
                  của chúng tôi.
                </p>
                <Button type="submit" disabled={isSubmitting || isSuccess} className="shrink-0">
                  {isSubmitting ? (
                    "Đang gửi..."
                  ) : isSuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Đã gửi
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Gửi thông tin
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-md border-emerald-200 bg-emerald-50/60 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Tại sao liên hệ với AHSO?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {supportReasons.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-3 rounded-md border border-emerald-200 bg-white p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.text}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-md border-amber-200 bg-white shadow-none">
            <div className="relative aspect-video">
              <iframe
                src={mapsEmbedUrl}
                title="Bản đồ Google Maps - AHSO"
                className="absolute inset-0 h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mở vị trí trên Google Maps"
                className="absolute inset-0"
              />
            </div>
            <CardContent className="border-t border-amber-200 bg-amber-50 p-4 text-sm font-medium text-gray-700">
              Nhấn vào bản đồ để mở Google Maps.
            </CardContent>
          </Card>

          <Card className="rounded-md border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Kết nối với chúng tôi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      aria-label={social.name}
                      title={social.name}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>

      <section className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="mb-3 h-1.5 w-14 bg-amber-500" />
            <h2 className="text-2xl font-bold text-gray-950">Câu hỏi thường gặp</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Một số thông tin hữu ích trước khi bạn liên hệ AHSO.
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="rounded-md border border-gray-200 bg-[#fbfcf8]">
                <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-gray-950">
                  {faq.question}
                </summary>
                <div className="border-t border-gray-200 px-4 py-4 text-sm leading-6 text-gray-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  children,
  icon: Icon,
  label,
  required = false,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      <div className="grid gap-2">
        <div className="relative">
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <div className="[&_input]:pl-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
