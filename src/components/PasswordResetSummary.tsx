import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Mail, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { devError } from '@/lib/dev';

interface ResetSummaryProps {
  username: string;
  resetDate: string;
  resetTime: string;
  adminNotified: boolean;
  onClose: () => void;
}

export const PasswordResetSummary = ({
  username,
  resetDate,
  resetTime,
  adminNotified,
  onClose
}: ResetSummaryProps) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  const generatePDF = async () => {
    try {
      // Dynamic import for better tree-shaking
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      if (!summaryRef.current) {
        toast.error('Failed to generate PDF');
        return;
      }

      // Create canvas from the summary content
      const canvas = await html2canvas(summaryRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      const fileName = `Password_Reset_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      devError('PDF generation error:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    if (summaryRef.current) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Password Reset Summary</title>');
        printWindow.document.write('<style>');
        printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
        printWindow.document.write('.summary { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }');
        printWindow.document.write('.header { text-align: center; margin-bottom: 30px; }');
        printWindow.document.write('.header h1 { color: #333; margin: 0 0 10px 0; }');
        printWindow.document.write('.section { margin-bottom: 20px; }');
        printWindow.document.write('.section-title { font-weight: bold; color: #555; margin-bottom: 10px; }');
        printWindow.document.write('.info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }');
        printWindow.document.write('.label { font-weight: 500; color: #666; }');
        printWindow.document.write('.value { color: #333; }');
        printWindow.document.write('.status { display: flex; align-items: center; gap: 8px; padding: 12px; background: #e8f5e9; border-radius: 6px; margin: 15px 0; }');
        printWindow.document.write('.success { color: #2e7d32; }');
        printWindow.document.write('.footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }');
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(summaryRef.current.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <div className="space-y-4">
      <div 
        ref={summaryRef}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Password Reset Successful</h2>
          <p className="text-gray-600 mt-1">Your password has been securely updated</p>
        </div>

        <div className="space-y-4 my-6">
          {/* Reset Details Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Reset Details</h3>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Admin Username:</span>
                <span className="font-medium text-gray-900">{username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reset Date:</span>
                <span className="font-medium text-gray-900">{resetDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reset Time:</span>
                <span className="font-medium text-gray-900">{resetTime}</span>
              </div>
            </div>
          </div>

          {/* Notification Status Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900">Admin Notification</h4>
                <p className="text-sm text-blue-800 mt-1">
                  A notification has been sent to the admin ({username}) confirming this password reset.
                </p>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">All systems verified and updated</span>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900">Security Notice</h4>
                <p className="text-sm text-amber-800 mt-1">
                  For security purposes, please log in with your new password immediately. Keep this confirmation secure and do not share it.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200">
          <p>Generated on {new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={generatePDF}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Download as PDF
        </Button>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1"
        >
          Print Summary
        </Button>
      </div>

      <Button
        onClick={onClose}
        variant="outline"
        className="w-full"
      >
        Close
      </Button>
    </div>
  );
};
