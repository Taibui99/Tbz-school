import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư",
  description: "Cách Tbz cloud thu thập, sử dụng và bảo vệ dữ liệu của bạn.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold">
        Chính sách quyền riêng tư
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cập nhật lần cuối: 24/08/2026
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-heading text-lg font-semibold">Dữ liệu chúng tôi lưu</h2>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Thông tin tài khoản: email, họ tên, ảnh đại diện (tùy chọn) do bạn cung cấp
              khi đăng ký hoặc đăng nhập bằng Google.
            </li>
            <li>Nội dung bạn tạo: workspace, bộ sưu tập, bài học, tài liệu, ghi chú.</li>
            <li>Dữ liệu kỹ thuật tối thiểu phục vụ vận hành (thời gian hoạt động, dung lượng).</li>
          </ul>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">Dữ liệu không công khai</h2>
          <p className="mt-2">
            Tài liệu riêng tư được lưu trên hạ tầng Supabase Storage ở chế độ private và chỉ
            truy cập qua liên kết ký có thời hạn ngắn. Chúng tôi{" "}
            <strong>không</strong> biến tài liệu riêng tư thành công khai để phục vụ tính năng.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">Video</h2>
          <p className="mt-2">
            Video bài giảng được đăng lên kênh YouTube trung tâm của hệ thống ở chế độ
            unlisted. YouTube có thể xử lý dữ liệu xem theo chính sách riêng của họ.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">Chia sẻ bên thứ ba</h2>
          <p className="mt-2">
            Chúng tôi không bán dữ liệu người dùng. Dịch vụ sử dụng các nhà cung cấp hạ
            tầng: Vercel (lưu trữ web), Supabase (cơ sở dữ liệu + tệp), Google/YouTube (video),
            Cloudflare Turnstile (chống bot, nếu bật).
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">Quyền của bạn</h2>
          <p className="mt-2">
            Bạn có thể xem, sửa thông tin hồ sơ trong trang Hồ sơ, xóa mềm tài liệu và khôi
            phục từ Thùng rác. Yêu cầu xóa tài khoản vĩnh viễn hãy liên hệ quản trị viên.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">Liên hệ</h2>
          <p className="mt-2">
            Về quyền riêng tư và bảo vệ dữ liệu: quản trị viên hệ thống Tbz cloud — email
            được công bố trong trang giới thiệu của trường/lớp sử dụng hệ thống.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Xem thêm:{" "}
        <Link href="/dieu-khoan" className="text-primary underline underline-offset-4">
          Điều khoản sử dụng
        </Link>
      </p>
    </article>
  );
}
