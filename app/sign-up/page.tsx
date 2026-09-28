import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div 
      className="flex min-h-screen items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/bglogin.png')" }}
    >
      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-0"></div>
      <div className="z-10 animate-in fade-in zoom-in duration-500">
        <SignUp />
      </div>
    </div>
  );
}
