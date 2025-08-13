import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/auth");
    }, 2000); // 2초 후 auth 페이지로 이동

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-primary text-primary-foreground">
          <span className="text-6xl font-bold">ARO</span>
        </div>
      </div>
    </div>
  );
};

export default Landing;