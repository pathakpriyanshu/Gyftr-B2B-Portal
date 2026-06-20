import { DownloadClient } from "./download-client";

export const metadata = { title: "Download Vouchers" };

export default function DownloadPage({ params }: { params: { token: string } }) {
  return <DownloadClient token={params.token} />;
}
