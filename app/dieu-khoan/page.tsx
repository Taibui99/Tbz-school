import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng nền tảng Tbz cloud.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold">Điều khoản sử dụng</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cập nhật lần cuối: 24/08/2026
      </p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed">
        <section>
          <h2 className="font-heading text-lg font-semibold">1. Chấp nhận điều khoản</h2>
          <p className="mt-2">
            Khi tạo tài khoản hoặc sử dụng Tbz cloud (&quot;Dịch vụ&quot;), bạn đồng ý với
            các điều khoản này. Nếu bạn không đồng ý, vui lòng ngừng sử dụng Dịch vụ.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">2. Tài khoản</h2>
          <p className="mt-2">
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động diễn ra
            trên tài khoản của mình. Chúng tôi có thể tạm khóa tài khoản vi phạm các
            điều khoản này.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">3. Nội dung bạn tải lên</h2>
          <p className="mt-2">
            Bạn giữ toàn bộ quyền sở hữu đối với tài liệu của mình. Bạn không được tải
            lên nội dung:
          </p>
          <ul className="mt-2 list-disc pl-5">
            <li>vi phạm bản quyền hoặc quyền sở hữu trí tuệ của bên khác;</li>
            <li>trái pháp luật, xúc phạm, kích động thù ghét hoặc khiêu dâm;</li>
            <li>giả mạo, lừa đảo hoặc phát tán mã độc.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">4. Kiểm duyệt</h2>
          <p className="mt-2">
            Người dùng có thể báo cáo tài liệu vi phạm. Quản trị viên có thể ẩn tài liệu
            khỏi thư viện công khai, khóa tài khoản vi phạm và lưu nhật ký xử lý mà không
            cần thông báo trước.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">5. Chia sẻ và công khai</h2>
          <p className="mt-2">
            Khi bạn đặt tài liệu ở chế độ công khai hoặc chia sẻ theo liên kết, người khác
            có thể xem tài liệu đó. Việc chia sẻ không làm tài liệu trở thành tài sản của
            Tbz cloud.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">6. Giới hạn dịch vụ</h2>
          <p className="mt-2">
            Dịch vụ được cung cấp &quot;nguyên trạng&quot;. Mỗi người dùng được cấp hạn mức
            lưu trữ (hiện 250 MB). Chúng tôi cố gắng bảo đảm dữ liệu an toàn nhưng không
            chịu trách nhiệm về mất mát dữ liệu ngoài sự kiểm soát hợp lý.
          </p>
        </section>
        <section>
          <h2 className="font-heading text-lg font-semibold">7. Liên hệ</h2>
          <p className="mt-2">
            Mọi thắc mắc hoặc báo cáo vi phạm bản quyền, hãy dùng nút{" "}
            <strong>Báo cáo</strong> trên từng tài liệu công khai hoặc liên hệ quản trị
            viên qua email trong phần Quyền riêng tư.
          </p>
        </section>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Xem thêm:{" "}
        <Link href="/quyen-rieng-tu" className="text-primary underline underline-offset-4">
          Chính sách quyền riêng tư
        </Link>
      </p>
    </article>
  );
}
