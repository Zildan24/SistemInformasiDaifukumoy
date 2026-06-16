import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const baseCustomClass = {
  popup: 'rounded-3xl shadow-2xl border border-pink-100', // Sangat membulat dan shadow lembut
  confirmButton: 'bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-6 rounded-xl transition-all', // Tombol Setuju Pink
  cancelButton: 'bg-white hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-6 rounded-xl border border-gray-200 transition-all ml-3', // Tombol Batal
  title: 'text-gray-800 font-black',
  htmlContainer: 'text-gray-500 font-medium',
};

// Kustomisasi Tema Pink Daifukumoy secara Global
const daifukuSwal = Swal.mixin({
  customClass: baseCustomClass,
  buttonsStyling: false, // Matikan styling bawaan Swal agar tailwind berfungsi penuh
  iconColor: '#FF65C5', // Ikon sukses, tanya, info menggunakan warna Pink utama
});

/**
 * Menampilkan Popup Sukses elegan
 */
export const showSuccess = (title: string, text?: string) => {
  return daifukuSwal.fire({
    imageUrl: '/happy1.png',
    imageWidth: 90,
    imageAlt: 'Success Mascot',
    title: title,
    text: text,
    confirmButtonText: 'Selesai',
    customClass: {
      ...baseCustomClass,
      image: 'animate-bounce drop-shadow-md'
    }
  });
};

/**
 * Menampilkan Popup Peringatan/Error elegan
 */
export const showError = (title: string, text?: string) => {
  return daifukuSwal.fire({
    icon: 'error',
    title: title,
    text: text,
    iconColor: '#ef4444', // Merah untuk error
    confirmButtonText: 'Mengerti',
    customClass: {
      ...baseCustomClass,
      confirmButton: 'bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all'
    }
  });
};

/**
 * Menampilkan Popup Konfirmasi elegan
 * @returns Promise<boolean> - True jika Setuju (Confirm), False jika Batal
 */
export const confirmAction = async (title: string, text?: string, confirmText: string = 'Lanjutkan'): Promise<boolean> => {
  const result = await daifukuSwal.fire({
    imageUrl: '/sure.png',
    imageWidth: 90,
    imageAlt: 'Question Mascot',
    title: title,
    text: text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Batal',
    reverseButtons: false,
    customClass: {
      ...baseCustomClass,
      image: 'animate-float drop-shadow-md'
    }
  });
  
  return result.isConfirmed;
};
