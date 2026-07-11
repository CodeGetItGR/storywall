import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MapPin, Phone, Globe, Car, Bed, Utensils, Wifi, CheckCircle2 } from 'lucide-react'

const amenities = [
  { icon: Car, label: 'Free parking for 200+ vehicles' },
  { icon: Bed, label: 'On-site accommodation — The Inn at Rosewood' },
  { icon: Utensils, label: 'Full-service catering & bar' },
  { icon: Wifi, label: 'High-speed WiFi throughout' },
  { icon: CheckCircle2, label: 'Accessible facilities & pathways' },
  { icon: MapPin, label: 'Complimentary shuttle from SF' },
]

const galleryImages = [
  { src: '/images/venue.png', alt: 'Rosewood Estate main lawn at sunset' },
  { src: '/images/couple-hero.png', alt: 'The vineyard grounds' },
  { src: '/images/post-florals.png', alt: 'Ceremony rose garden' },
  { src: '/images/post-cake.png', alt: 'Grand pavilion interior' },
]

export default function VenuePage() {
  return (
    <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <Link href="/tools" aria-label="Back to tools" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-sky-500" />
          <h1 className="text-base font-bold text-ink">Venue</h1>
        </div>
      </div>

      {/* Hero image */}
      <div className="relative w-full aspect-video bg-surface-muted overflow-hidden">
        <Image
          src="/images/venue.png"
          alt="Rosewood Estate, Napa Valley — the wedding venue"
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 672px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-5 left-5 text-white">
          <h2 className="text-2xl font-bold leading-tight">Rosewood Estate</h2>
          <p className="text-sm opacity-80 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Napa Valley, California
          </p>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-6">
        {/* About */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-2">About the Venue</h3>
          <p className="text-sm text-ink-muted leading-relaxed">
            Rosewood Estate is a stunning 40-acre vineyard estate in the heart of Napa Valley.
            With its sweeping rose garden ceremony lawn, grand pavilion reception hall, and
            breathtaking views of the vineyards, it&apos;s the perfect backdrop for Emma and
            James&apos;s celebration. The estate has hosted weddings for over 25 years.
          </p>
        </div>

        {/* Contact info */}
        <div className="bg-surface-muted rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
              <MapPin className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Address</p>
              <p className="text-sm font-medium text-ink">1842 Silverado Trail, Napa, CA 94558</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
              <Phone className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Phone</p>
              <p className="text-sm font-medium text-ink">(707) 555-0192</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 shadow-sm">
              <Globe className="w-4 h-4 text-sky-500" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">Website</p>
              <a
                href="#"
                className="text-sm font-medium text-primary hover:underline"
              >
                www.rosewood-estate.com
              </a>
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-2">Getting There</h3>
          <div className="w-full rounded-2xl overflow-hidden bg-surface-muted aspect-[16/9] relative flex items-center justify-center border border-border">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-ink-faint mx-auto mb-2" />
              <p className="text-sm text-ink-muted font-medium">Rosewood Estate</p>
              <p className="text-xs text-ink-faint">Napa Valley, CA</p>
            </div>
            <div className="absolute bottom-3 right-3">
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition-colors"
              >
                Open in Maps
              </a>
            </div>
          </div>
          <p className="text-xs text-ink-muted mt-2 leading-relaxed">
            <strong>By car:</strong> 1 hour 20 min from San Francisco via US-101N and CA-37E. Free parking on-site.
            <br />
            <strong>Shuttle:</strong> Complimentary shuttle departs from Union Square, SF at 2:30 PM on Oct 18.
          </p>
        </div>

        {/* Amenities */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-3">Amenities</h3>
          <div className="grid grid-cols-1 gap-2">
            {amenities.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <p className="text-sm text-ink-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo gallery */}
        <div>
          <h3 className="text-sm font-bold text-ink mb-3">Gallery</h3>
          <div className="grid grid-cols-2 gap-2">
            {galleryImages.map(img => (
              <div key={img.src} className="relative aspect-square rounded-2xl overflow-hidden bg-surface-muted">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 50vw, 300px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
