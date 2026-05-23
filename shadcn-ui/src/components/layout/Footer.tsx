import { Heart, Github, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-gray-50 via-blue-50 to-purple-50 border-t border-gray-200 py-6 px-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* About Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg/1200px-Lambang_Badan_Pusat_Statistik_%28BPS%29_Indonesia.svg.png"
                alt="Logo BPS"
                className="h-5 w-5"
              />
              BPS Kota Surabaya
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Sistem Manajemen Standard Operating Procedure untuk meningkatkan 
              efisiensi dan kualitas layanan data statistik.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Kontak</h3>
            <div className="space-y-2">
              <a 
                href="tel:+623182516020"
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Phone className="h-3 w-3" />
                (62-31) 82516020
              </a>
              <a 
                href="mailto:bps3578@bps.go.id"
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Mail className="h-3 w-3" />
                bps3578@bps.go.id
              </a>
              <a 
                href="https://www.google.com/maps/place/Badan+Pusat+Statistik+Kota+Surabaya/@-7.328492,112.7261652,1044m/data=!3m1!1e3!4m16!1m9!3m8!1s0x2dd7fb42a2028c4b:0x6ee99db676fcc3d2!2sBadan+Pusat+Statistik+Kota+Surabaya!8m2!3d-7.3283651!4d112.7284813!9m1!1b1!16s%2Fg%2F11b6dnpp3v!3m5!1s0x2dd7fb42a2028c4b:0x6ee99db676fcc3d2!8m2!3d-7.3283651!4d112.7284813!16s%2Fg%2F11b6dnpp3v?entry=ttu&g_ep=EgoyMDI1MTIwNy4wIKXMDSoKLDEwMDc5MjA3M0gBUAM%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">
                  Jl. A. Yani 152 E Surabaya 60231 Jawa Timur Indonesia
                </span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Tautan Cepat</h3>
            <div className="space-y-2">
              <a 
                href="https://surabayakota.bps.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                Website BPS Surabaya →
              </a>
              <a 
                href="https://www.bps.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                BPS Pusat →
              </a>
              <a 
                href="/settings"
                className="block text-xs text-gray-600 hover:text-blue-600 transition-colors"
              >
                Bantuan & Dokumentasi →
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2">
            {/* Copyright */}
            <p className="text-xs text-gray-600 text-center md:text-left">
              © {currentYear} Badan Pusat Statistik Kota Surabaya. All rights reserved.
            </p>

            {/* Made with Love */}
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                Dibuat dengan <Heart className="h-3 w-3 text-red-500 fill-red-500" /> 
                untuk BPS Surabaya
              </p>
              
              {/* Version Badge */}
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                v2.0.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}