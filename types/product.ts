export interface Product {
  $id: string;
  name: string;
  price: number;
  description: string;
  image?: string;
  // Menambahkan atribut untuk relasi galeri
  gallery: string[]; // Ini akan menjadi array dari ID dokumen galeri
  // Menggunakan nama relasi yang benar
  agentId: string;
  status: 'active' | 'inactive';
}