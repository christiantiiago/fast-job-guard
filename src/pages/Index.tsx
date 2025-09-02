import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Categories from "@/components/sections/Categories";
import HowItWorks from "@/components/sections/HowItWorks";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Categories />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
