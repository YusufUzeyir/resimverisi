'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTheme } from 'next-themes';
import exifr from 'exifr';
import dynamic from 'next/dynamic';
import type { LatLngTuple } from 'leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import 'leaflet/dist/leaflet.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Harita bileşenini dinamik olarak yükle
const Map = dynamic(
  () => import('@/components/Map'),
  { ssr: false }
);

interface MetaData {
  Make?: string;
  Model?: string;
  DateTime?: string;
  GPSLatitude?: number[] | number;
  GPSLongitude?: number[] | number;
  ImageWidth?: number;
  ImageHeight?: number;
  ColorType?: string;
  Compression?: string;
  [key: string]: any;
}

// Meta veri alanlarının Türkçe karşılıkları
const metaDataTranslations: { [key: string]: string } = {
  Make: 'Üretici',
  Model: 'Model',
  DateTime: 'Tarih/Saat',
  GPSLatitude: 'GPS Enlemi',
  GPSLongitude: 'GPS Boylamı',
  ImageWidth: 'Resim Genişliği',
  ImageHeight: 'Resim Yüksekliği',
  ColorType: 'Renk Tipi',
  Compression: 'Sıkıştırma',
  BitDepth: 'Bit Derinliği',
  Interlace: 'Tarama Yöntemi',
  Filter: 'Filtre',
};

// GPS koordinatlarını ondalık formata çeviren fonksiyon
const convertGPSToDecimal = (gps: number[] | number): number => {
  if (Array.isArray(gps)) {
    const [degrees, minutes, seconds] = gps;
    return degrees + minutes / 60 + seconds / 3600;
  }
  return gps;
};

export default function ImageUploader() {
  const [mounted, setMounted] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MetaData | null>(null);
  const [coordinates, setCoordinates] = useState<LatLngTuple | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'terrain'>('streets');
  const { theme, setTheme } = useTheme();

  // Hydration için mounted kontrolü
  useEffect(() => {
    setMounted(true);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);

      try {
        const data = await exifr.parse(file);
        setMetadata(data || { message: 'Bu resimde meta veri bulunamadı.' });
        
        if (data?.GPSLatitude && data?.GPSLongitude) {
          const lat = convertGPSToDecimal(data.GPSLatitude);
          const lng = convertGPSToDecimal(data.GPSLongitude);
          setCoordinates([lat, lng]);
        } else {
          setCoordinates(null);
        }
      } catch (error) {
        console.error('Meta veri okuma hatası:', error);
        setMetadata({ message: 'Meta veri okuma hatası oluştu.' });
        setCoordinates(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value?.toString() || '';
  };

  // Meta verilerin grafiksel gösterimi için veri hazırlama
  const chartData = {
    labels: ['Genişlik', 'Yükseklik', 'Bit Derinliği'],
    datasets: [
      {
        label: 'Resim Özellikleri',
        data: metadata ? [
          metadata.ImageWidth || 0,
          metadata.ImageHeight || 0,
          metadata.BitDepth || 0
        ] : [],
        borderColor: theme === 'dark' ? '#60a5fa' : '#2563eb',
        backgroundColor: theme === 'dark' ? '#60a5fa50' : '#2563eb50',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Resim Özellikleri Grafiği'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Tema butonunun içeriği için yardımcı fonksiyon
  const getThemeButtonContent = () => {
    if (!mounted) return null; // Sayfa yüklenene kadar boş göster
    return theme === 'dark' ? '🌞 Aydınlık Tema' : '🌙 Karanlık Tema';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-sky-600 dark:text-sky-400">
            Resim Meta Veri Görüntüleyici
          </h1>
          <div className="flex gap-4 w-full sm:w-auto">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
            >
              {getThemeButtonContent()}
            </button>
            {coordinates && (
              <select
                value={mapStyle}
                onChange={(e) => setMapStyle(e.target.value as any)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
              >
                <option value="streets">Sokak Haritası</option>
                <option value="satellite">Uydu Görüntüsü</option>
                <option value="terrain">Arazi Haritası</option>
              </select>
            )}
          </div>
        </div>

        {/* Ana İçerik */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Dosya Yükleme Alanı */}
            <div
              {...getRootProps()}
              className={`relative rounded-lg p-6 sm:p-12 text-center transition-all
                ${isDragActive 
                  ? 'bg-sky-50 dark:bg-sky-900/20 border-2 border-dashed border-sky-500' 
                  : 'bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                } shadow-sm hover:shadow-md`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-sky-500 p-4 group-hover:scale-105 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-lg sm:text-xl font-medium text-gray-700 dark:text-gray-200">
                    {isDragActive
                      ? 'Resmi buraya bırakın'
                      : 'Resim yüklemek için tıklayın veya sürükleyip bırakın'}
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Desteklenen formatlar: JPEG, JPG, PNG, GIF
                  </p>
                </div>
              </div>
            </div>

            {image && (
              <div className="space-y-6">
                {/* Yüklenen Resim */}
                <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
                  <img src={image} alt="Yüklenen resim" className="w-full h-auto max-h-[500px] object-contain" />
                </div>
                
                {metadata && (
                  <>
                    {/* Meta Veriler */}
                    <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all p-6">
                      <h3 className="text-xl font-semibold mb-4 text-sky-600 dark:text-sky-400">
                        Meta Veriler
                      </h3>
                      <div className="grid gap-4">
                        {Object.entries(metadata).map(([key, value]) => {
                          if (key === 'message') {
                            return (
                              <div key={key} className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200">
                                {value}
                              </div>
                            );
                          }

                          return (
                            <div key={key} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {metaDataTranslations[key] ? 
                                  `${key} (${metaDataTranslations[key]})` : 
                                  key}
                              </div>
                              <div className="mt-1 font-mono text-sm text-gray-600 dark:text-gray-300">
                                {formatValue(value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grafik */}
                    <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all p-6">
                      <h3 className="text-xl font-semibold mb-4 text-sky-600 dark:text-sky-400">
                        Grafik Gösterim
                      </h3>
                      <Line data={chartData} options={chartOptions} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Harita */}
          {coordinates && (
            <div className="lg:sticky lg:top-8">
              <div className="rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all overflow-hidden h-[400px] lg:h-[700px]">
                <Map coordinates={coordinates} mapStyle={mapStyle} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 