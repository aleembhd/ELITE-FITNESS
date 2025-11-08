"use client";

import React from "react";

import { useState } from "react";
import emailjs from '@emailjs/browser';
import { motion, easeOut } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Phone,
  Menu,
  Dumbbell,
  ShieldCheck,
  Clock,
  HeartPulse,
  Flame,
  Bike,
  Apple,
  Users,
  MapPin,
  Instagram,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const navItems = [
  { href: "#about", label: "About" },
  { href: "#services", label: "Services" },
  { href: "#gallery", label: "Facilities" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faqs", label: "FAQs" },
  { href: "#contact", label: "Contact" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  show: { opacity: 1, x: 0 },
};

const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  show: { opacity: 1, x: 0 },
};

const staggerContainer = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const baseTransition = { duration: 0.45, ease: easeOut };

const MotionCard = motion(Card);

function Navbar({
  gymName,
  phoneNumber,
}: {
  gymName: string;
  phoneNumber: string;
}) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // simple scroll handler for solid background
  React.useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    setTimeout(() => {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors",
        solid
          ? "bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/90 border-b border-white/20"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand name - only visible when scrolled */}
        <div
          className={cn(
            "flex items-center",
            solid ? "opacity-100" : "opacity-0",
            "transition-opacity"
          )}
        >
          <h1 className="font-heading text-xl md:text-2xl font-bold text-white tracking-wide">
            ELITE GYM
          </h1>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm hover:opacity-80 transition-opacity",
                solid ? "text-white" : "text-white"
              )}
            >
              {item.label}
            </a>
          ))}
          <Button
            asChild
            className={cn(
              "rounded-2xl",
              !solid
                ? "text-black border-black hover:bg-black hover:text-white bg-white"
                : ""
            )}
            variant={!solid ? "outline" : "default"}
          >
            <a href={`tel:${phoneNumber}`}>
              <Phone className="mr-2 h-4 w-4" />
              Call Now
            </a>
          </Button>
        </div>

        {/* Mobile drawer */}
        <div className="md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu
                  className={cn("h-6 w-6", solid ? "text-white" : "text-white")}
                />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-80 p-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-center border-b p-6">
                  <h1 className="font-heading text-xl font-bold tracking-wide">
                    ELITE GYM
                  </h1>
                </div>

                <nav className="flex flex-col gap-1 p-6">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={handleNavClick(item.href)}
                      className="rounded-lg px-2 py-3 text-base hover:bg-muted transition-colors"
                      aria-label={item.label}
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                {/* sticky footer area for the CTA in the drawer */}
                <div className="mt-auto border-t p-6">
                  <Button asChild className="w-full rounded-2xl">
                    <a href={`tel:${phoneNumber}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call Now
                    </a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

function Hero({ phoneNumber }: { phoneNumber: string }) {
  return (
    <section className="relative isolate min-h-[80svh] md:min-h-[90svh]">
      {/* Desktop image - using hero-gym.jpg from public folder */}
      <div className="hidden md:block">
        <Image
          src="/hero-gym.jpg"
          alt="Gym facility hero"
          fill
          className="object-cover object-top"
          priority
        />
      </div>
      {/* Mobile image - using hero-gym.jpg from public/images folder */}
      <div className="block md:hidden">
        <Image
          src="/images/hero-gym.jpg"
          alt="Gym facility hero"
          fill
          className="object-cover object-top"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/50 to-primary/30" aria-hidden />
      <div className="relative mx-auto flex min-h-[80svh] max-w-6xl flex-col items-center justify-center px-4 text-background md:min-h-[90svh]">
        <motion.h1
          className="font-heading text-center text-3xl md:text-5xl font-extrabold text-pretty"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={baseTransition}
        >
          Transform Your Body at{" "}
          <span id="gym-name-display" className="whitespace-nowrap">
            ELITE GYM
          </span>
        </motion.h1>
        <motion.p
          className="mt-3 text-center text-base md:text-lg leading-relaxed max-w-2xl"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.1, ...baseTransition }}
        >
          Expert trainers. Modern equipment. Real results.
        </motion.p>
        <motion.div
          className="mt-6 flex items-center gap-3"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.2, ...baseTransition }}
        >
          <Button asChild className="rounded-2xl">
            <a href={`tel:${phoneNumber}`}>Call Now</a>
          </Button>
          <Button
            variant="outline"
            asChild
            className="rounded-2xl border-background text-background hover:bg-background hover:text-foreground bg-transparent"
          >
            <a href="#pricing">View Plans</a>
          </Button>
        </motion.div>
        <motion.p
          className="mt-6 text-sm opacity-90 hidden md:block"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.4, ...baseTransition }}
          aria-label="Location"
        >
          {"📍 Located in Vaidehinagar,  B.N. Reddy Nagar, Hyderabad Telangana"}
        </motion.p>
      </div>
    </section>
  );
}

function About() {
  const features = [
    {
      icon: ShieldCheck,
      title: "Expert Trainers",
      description: "Certified professionals dedicated to your fitness journey",
    },
    {
      icon: Dumbbell,
      title: "Modern Equipment",
      description:
        "State-of-the-art facilities for optimal training experience",
    },
    {
      icon: Clock,
      title: "Flexible Hours",
      description: "Extended timings to fit your busy schedule",
    },
  ];

  return (
    <section id="about" className="scroll-mt-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
        <motion.div
          className="relative h-64 w-full overflow-hidden rounded-xl md:h-full"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={baseTransition}
        >
          <Image
            src="/images/about-gym.jpg"
            alt="Members training at the gym"
            fill
            className="object-cover"
          />
        </motion.div>
        <motion.div
          className="flex flex-col justify-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.h2
            className="font-heading text-2xl md:text-3xl font-bold"
            variants={fadeInUp}
            transition={baseTransition}
          >
            Why Choose <span className="text-accent">ELITE GYM?</span>
          </motion.h2>
          <motion.p
            className="mt-3 leading-relaxed text-base"
            variants={fadeInUp}
            transition={{ duration: 0.45, ease: easeOut, delay: 0.1 }}
          >
            At our gym, we combine certified coaching, top-tier equipment, and
            an energetic atmosphere to help you reach your goals—whether you’re
            a beginner or an athlete.
          </motion.p>

          <motion.p
            className="mt-4 leading-relaxed text-base text-gray-600"
            variants={fadeInUp}
            transition={{ duration: 0.45, ease: easeOut, delay: 0.2 }}
          ></motion.p>

          {/* Feature cards with alternating slide-in animations */}
          <motion.div
            className="mt-6 space-y-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map(({ icon: Icon, title, description }, index) => (
              <MotionCard
                key={title}
                variants={index % 2 === 0 ? slideInLeft : slideInRight}
                transition={{ ...baseTransition, duration: 0.6 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="will-change-transform"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-accent/10 shrink-0">
                      <Icon className="h-6 w-6 text-accent" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </MotionCard>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    {
      image: "/images/Weight Training.png",
      title: "Weight Training",
    },
    {
      image: "/images/Cardio.png",
      title: "Cardio",
    },
    {
      image: "/images/CrossFit.png",
      title: "CrossFit",
    },
    {
      image: "/images/Group Classes.png",
      title: "Group Classes",
    },

    {
      image: "/images/Zumba.png",
      title: "Zumba",
    },

    {
      image: "/images/Aerobics.png",
      title: "Aerobics",
    },
    {
      image: "/images/Nutrition Consultation.png",
      title: "Nutrition Consultation",
    },
    {
      image: "/images/Personal Training.png",
      title: "Personal Training",
    },

    {
      image: "/images/Fitness Programs.png",
      title: "Fitness Programs",
    },
  ];
  return (
    <section id="services" className="scroll-mt-24 bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <div className="text-center">
          <motion.h2
            className="font-heading text-2xl md:text-3xl font-bold"
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={baseTransition}
          >
            Our <span className="text-accent">Services</span>
          </motion.h2>
          <motion.p
            className="mt-2 text-muted-foreground"
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: 0.1, ...baseTransition }}
          >
            Everything you need for a complete fitness transformation under one
            roof
          </motion.p>
        </div>

        {/* Desktop grid view - 3 columns */}
        <motion.div
          className="mt-8 hidden grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:grid"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
          {services.map((s) => (
            <motion.div
              key={s.title}
              className="flex flex-col items-center will-change-transform"
              variants={fadeInUp}
              transition={baseTransition}
              whileHover={{ y: -4 }}
            >
              <div className="relative overflow-hidden rounded-xl" style={{ width: '357px', height: '216px' }}>
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  className="object-cover"
                />
              </div>
              <h3 className="font-semibold text-lg mt-4 text-center">{s.title}</h3>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile carousel view - 2 services per slide */}
        <div className="mt-8 md:hidden">
          <Carousel className="w-full">
            <CarouselContent>
              {Array.from({ length: Math.ceil(services.length / 2) }).map(
                (_, slideIndex) => (
                  <CarouselItem key={slideIndex} className="basis-full">
                    <div className="space-y-4">
                      {services
                        .slice(slideIndex * 2, slideIndex * 2 + 2)
                        .map((s) => (
                          <motion.div
                            key={s.title}
                            className="flex flex-col items-center will-change-transform"
                            variants={fadeInUp}
                            transition={baseTransition}
                            whileHover={{ y: -4 }}
                          >
                            <div className="relative overflow-hidden rounded-xl" style={{ width: '343px', height: '200px' }}>
                              <Image
                                src={s.image}
                                alt={s.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <h3 className="font-semibold text-lg mt-4 text-center">{s.title}</h3>
                          </motion.div>
                        ))}
                    </div>
                  </CarouselItem>
                )
              )}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function Facilities() {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageScale, setImageScale] = useState(1);

  const facilities = [
    {
      src: "/images/gallery-1.jpg",
      alt: "Cardio Zone - State-of-the-art treadmills and cardio equipment",
    },
    {
      src: "/images/gallery-2.jpg",
      alt: "Weight Training Area - Premium strength training equipment",
    },
    {
      src: "/images/gallery-3.jpg",
      alt: "Group Classes - Spacious studio for yoga and group workouts",
    },
    {
      src: "/images/gallery-4.jpg",
      alt: "Functional Training - CrossFit and functional fitness area",
    },
    {
      src: "/images/gallery-5.jpg",
      alt: "Boxing Ring - Professional boxing and combat training",
    },
    {
      src: "/images/gallery-6.jpg",
      alt: "Group Fitness - Energizing group workout sessions",
    },
  ];

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setImageScale(1);
  };

  const closeImageModal = () => {
    setSelectedImageIndex(null);
    setImageScale(1);
  };

  const goToPrevious = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(selectedImageIndex === 0 ? facilities.length - 1 : selectedImageIndex - 1);
      setImageScale(1);
    }
  };

  const goToNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(selectedImageIndex === facilities.length - 1 ? 0 : selectedImageIndex + 1);
      setImageScale(1);
    }
  };

  const zoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.5, 0.5));
  };

  return (
    <section id="gallery" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <div className="text-center">
          <motion.h2
            className="font-heading text-2xl md:text-3xl font-bold"
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={baseTransition}
          >
            Our <span className="text-accent">Facilities</span>
          </motion.h2>
          <motion.p
            className="mt-2 text-muted-foreground"
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: 0.1, ...baseTransition }}
          >
            Take a tour of our premium gym facilities and training spaces
          </motion.p>
        </div>

        {/* Desktop Grid - 3 columns, 2 rows */}
        <motion.div
          className="mt-8 hidden md:grid grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {facilities.map((facility, index) => (
            <motion.div
              key={facility.src}
              variants={fadeInUp}
              transition={{ ...baseTransition, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="relative overflow-hidden rounded-xl will-change-transform"
              style={{ aspectRatio: "4/3" }}
            >
              <Image
                src={facility.src}
                alt={facility.alt}
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Vertical Grid with Click to Open */}
        <motion.div
          className="mt-8 md:hidden grid grid-cols-1 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {facilities.map((facility, index) => (
            <motion.div
              key={facility.src}
              variants={fadeInUp}
              transition={{ ...baseTransition, delay: index * 0.1 }}
              className="relative overflow-hidden rounded-xl will-change-transform cursor-pointer"
              style={{ aspectRatio: "4/3" }}
              onClick={() => openImageModal(index)}
            >
              <Image
                src={facility.src}
                alt={facility.alt}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/90 rounded-full p-2">
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Image Gallery Modal */}
        <Dialog open={selectedImageIndex !== null} onOpenChange={closeImageModal}>
          <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/95 border-none">
            <div className="relative w-full h-full flex items-center justify-center">
              {selectedImageIndex !== null && (
                <>
                  {/* Close Button */}
                  <button
                    onClick={closeImageModal}
                    className="absolute top-4 right-4 z-50 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Previous Button */}
                  <button
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Next Button */}
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Zoom Controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2">
                    <button
                      onClick={zoomOut}
                      className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                      disabled={imageScale <= 0.5}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <span className="bg-white/20 rounded-full px-3 py-2 text-white text-sm">
                      {Math.round(imageScale * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                      disabled={imageScale >= 3}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </button>
                  </div>

                  {/* Image Container */}
                  <div className="relative w-full h-full overflow-auto flex items-center justify-center p-8">
                    <div 
                      className="relative transition-transform duration-300 ease-out"
                      style={{ transform: `scale(${imageScale})` }}
                    >
                      <Image
                        src={facilities[selectedImageIndex].src}
                        alt={facilities[selectedImageIndex].alt}
                        width={800}
                        height={600}
                        className="max-w-full max-h-full object-contain"
                        priority
                      />
                    </div>
                  </div>

                  {/* Image Counter */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/20 rounded-full px-3 py-1">
                    <span className="text-white text-sm">
                      {selectedImageIndex + 1} / {facilities.length}
                    </span>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "1 Month",
      price: "₹2,500",
      period: "",
      features: [
        "Access to gym equipment",
        "Cardio zone access",
        "Locker facilities",
        "Basic fitness assessment",
        "Standard hours access",
      ],
      highlight: false,
    },
    {
      name: "3 Months",
      price: "₹6,000",
      period: "",
      features: [
        "All 1 Month features",
        "Group class access",

        "Nutrition consultation",
        "Extended hours access",
        "Better value per month",
      ],
      highlight: true,
      badge: "Most Popular",
    },
    {
      name: "6 Months",
      price: "₹9,000",
      period: "",
      features: [
        "All 3 Month features",
        "Priority equipment access",
        "Diet plan customization",
        "Guest passes included",
        "Extended hours access",
        "Best value per month",
      ],
      highlight: false,
    },
    {
      name: "12 Months",
      price: "₹14,000",
      period: "",
      features: [
        "All 6 Month features",
        "12 PT Sessions FREE",
        "Personal training included",
        "Premium locker access",
        "Maximum savings",
        "Complete fitness package",
      ],
      highlight: false,
      badge: "Best Value",
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-24 bg-secondary">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
        <div className="text-center">
          <motion.h2
            className="font-heading text-2xl md:text-3xl font-bold"
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={baseTransition}
          >
            Membership <span className="text-accent">Plans</span>
          </motion.h2>
          <motion.p
            className="mt-2 text-muted-foreground"
            variants={fadeInUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: 0.1, ...baseTransition }}
          >
            Choose the perfect plan to kickstart your fitness journey
          </motion.p>
        </div>

        <motion.div
          className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {plans.map((plan) => (
            <MotionCard
              key={plan.name}
              className={cn(
                "relative flex flex-col will-change-transform",
                plan.highlight && "ring-2 ring-accent shadow-lg scale-105"
              )}
              variants={fadeInUp}
              transition={baseTransition}
              whileHover={{ y: -6 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium">
                    {plan.badge}
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-accent">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-accent mt-1">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={cn(
                    "w-full rounded-2xl",
                    plan.highlight
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-background text-foreground border hover:bg-accent hover:text-accent-foreground"
                  )}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  <a href="tel:+919160049994">Call to Join</a>
                </Button>
              </CardContent>
            </MotionCard>
          ))}
        </motion.div>

        <motion.p
          className="mt-8 text-center text-sm text-muted-foreground"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.3, ...baseTransition }}
        >
          All plans include access to basic facilities and equipment.{" "}
          <span className="text-accent">Contact us</span> for corporate or
          family packages.
        </motion.p>
      </div>
    </section>
  );
}

function FAQs() {
  const items = [
    {
      q: "What are your gym timings?",
      a: "Monday to Saturday: 5:00 AM - 10:00 PM | Sunday: 5:00 AM - 10:00 AM & 5:00 PM - 10:00 PM",
    },
    {
      q: "Do you offer personal training?",
      a: "Yes, certified personal trainers are available by appointment.",
    },
    {
      q: "Do you provide diet consultation?",
      a: "Yes, our nutrition experts can create personalized diet plans to complement your training.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept UPI, credit/debit cards, and cash payments.",
    },
    {
      q: "Is parking available at the gym?",
      a: "Yes, we provide free parking facilities for all our members.",
    },
  ];
  return (
    <section id="faqs" className="scroll-mt-24">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
        <motion.h2
          className="font-heading text-2xl md:text-3xl font-bold text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={baseTransition}
        >
          Frequently Asked Questions
        </motion.h2>
        <Accordion type="single" collapsible className="mt-6">
          {items.map((it, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left">{it.q}</AccordionTrigger>
              <AccordionContent>{it.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function Contact({
  gymName,
  phoneNumber,
}: {
  gymName: string;
  phoneNumber: string;
}) {
  // Official gym email
  const gymEmail = "Elitegym1122@gmail.com";
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name.trim() || !formData.phone.trim() || !formData.message.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      // EmailJS configuration
      const templateParams = {
        user_name: formData.name,
        user_phone: formData.phone,
        user_message: formData.message
      };

      await emailjs.send(
        'service_4bp2k2d',
        'template_s5e7lfe',
        templateParams,
        'hDXaDgCVB9p89RheX'
      );

      alert('Message sent successfully! ELITE GYM team will contact you soon.');
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        message: ''
      });
    } catch (error) {
      console.error('EmailJS error:', error);
      alert('Failed to send. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 px-4 py-12 md:py-20">
        <motion.div
          className="relative h-72 w-full overflow-hidden rounded-xl md:h-full"
          variants={fadeInUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={baseTransition}
        >
          {/* Simple Google Maps embed (no API key) */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3808.5988727568442!2d78.5693616!3d17.3348926!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcba1fed936954d%3A0xee6487ce2564de88!2sElite%20Gym%20Vanasthalipuram!5e0!3m2!1sen!2sin!4v1761999849723!5m2!1sen!2sin"
            width="600"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Gym Location"
            className="h-full w-full"
          />
        </motion.div>
        <motion.div
          className="flex flex-col justify-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          transition={{ delay: 0.1, ...baseTransition }}
        >
          <motion.h2
            className="font-heading text-2xl md:text-3xl font-bold"
            variants={fadeInUp}
            transition={baseTransition}
          >
            Get in Touch
          </motion.h2>
          <motion.div
            className="mt-3 space-y-2 text-sm leading-relaxed"
            variants={staggerContainer}
            transition={{ delay: 0.2, ...baseTransition }}
          >
            <motion.p
              className="flex items-center gap-2"
              variants={fadeInUp}
              transition={{ delay: 0.3, ...baseTransition }}
            >
              <Phone className="h-4 w-4" aria-hidden /> {phoneNumber}
            </motion.p>
            <motion.p
              className="flex items-center gap-2"
              variants={fadeInUp}
              transition={{ delay: 0.4, ...baseTransition }}
            >
              <MapPin className="h-4 w-4" aria-hidden /> D.No 298, Prashanth Nagar, Above Reliance Fresh, Vanasthalipuram Main Road, Hyderabad 500070
            </motion.p>
            <motion.p
              variants={fadeInUp}
              transition={{ delay: 0.5, ...baseTransition }}
            >
              Email: {gymEmail}
            </motion.p>
            <motion.p
              variants={fadeInUp}
              transition={{ delay: 0.6, ...baseTransition }}
            >
              Mon-Sat: 5AM-10PM | Sun: 5AM-10AM & 5PM-10PM
            </motion.p>
            <motion.div
              className="flex gap-2"
              variants={fadeInUp}
              transition={{ delay: 0.7, ...baseTransition }}
            >
              <Button
                asChild
                className="rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] text-white border-0"
              >
                <a
                  href={`https://wa.me/${phoneNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.form
            className="mt-6 grid grid-cols-1 gap-3"
            onSubmit={handleSubmit}
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            transition={{ delay: 0.8, ...baseTransition }}
          >
            <motion.input
              required
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Name"
              className="h-11 rounded-lg border bg-background px-3 text-sm"
              aria-label="Name"
              variants={fadeInUp}
              transition={baseTransition}
              disabled={isSubmitting}
            />
            <motion.input
              required
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone"
              className="h-11 rounded-lg border bg-background px-3 text-sm"
              aria-label="Phone"
              variants={fadeInUp}
              transition={baseTransition}
              disabled={isSubmitting}
            />
            <motion.textarea
              required
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Message"
              className="min-h-28 rounded-lg border bg-background p-3 text-sm"
              aria-label="Message"
              variants={fadeInUp}
              transition={baseTransition}
              disabled={isSubmitting}
            />
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 h-12 rounded-2xl bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              variants={fadeInUp}
              transition={baseTransition}
            >
              {isSubmitting ? 'Sending...' : 'Submit'}
            </motion.button>
            <motion.p
              className="text-xs opacity-70"
              variants={fadeInUp}
              transition={{ delay: 0.9, ...baseTransition }}
            >
              Call or WhatsApp us to get started.
            </motion.p>
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
}

function Footer({
  gymName,
}: {
  gymName: string;
}) {
  // Official gym email
  const gymEmail = "officialtheprivategym@gmail.com";
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
          <div>
            <Logo name={gymName} />
            <p className="mt-2 text-sm opacity-90">Train Hard. Stay Strong.</p>
          </div>
          <nav className="flex flex-wrap gap-4 md:justify-center">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm hover:opacity-80"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 md:justify-end">
            <a
              href="https://www.instagram.com/elitegymvanasthalipuram/?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="rounded-full p-2 hover:bg-primary-foreground/10"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href={`mailto:${gymEmail}`}
              aria-label="Email"
              className="rounded-full p-2 hover:bg-primary-foreground/10"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
        <div className="mt-6 border-t border-primary-foreground/20 pt-4 text-center text-xs opacity-80">
          © 2025 {gymName} | All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

function StickyMobileCTA({ phoneNumber }: { phoneNumber: string }) {
  return (
    <div className="fixed left-3 bottom-3 z-50 md:hidden">
      <Button
        asChild
        className="h-11 rounded-2xl shadow-lg px-4" // reduced horizontal padding
      >
        <a href={`tel:${phoneNumber}`} aria-label="Call the gym">
          <Phone className="mr-2 h-4 w-4" />
          Call Now
        </a>
      </Button>
    </div>
  );
}

function NameUpdateDialog({
  open,
  onOpenChange,
  onUpdateName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateName: (name: string, phone: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateName(name, phone);
    onOpenChange(false);
    setName("");
    setPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Gym Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter gym name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            required
          />
          <input
            type="tel"
            placeholder="Enter phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            required
          />
          <Button type="submit" className="w-full">
            Update Information
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Logo({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/images/logo.png"
        alt="ELITE GYM Logo"
        width={24}
        height={24}
        className="rounded-full"
      />
      <span className="font-heading text-lg font-bold">ELITE GYM</span>
    </div>
  );
}

export default function Page() {
  const [gymName, setGymName] = useState("ELITE GYM");
  const [phoneNumber, setPhoneNumber] = useState("8297771112");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Load gym name and phone number from localStorage on component mount
  React.useEffect(() => {
    const savedName = localStorage.getItem("gymName");
    const savedPhone = localStorage.getItem("gymPhone");
    if (savedName) {
      setGymName(savedName);
      // Update the hero section text
      const heroTitle = document.querySelector("#gym-name-display");
      if (heroTitle) {
        heroTitle.textContent = savedName;
      }
    }
    if (savedPhone) {
      setPhoneNumber(savedPhone);
    }
  }, []);

  const handleUpdateName = (name: string, phone: string) => {
    setGymName(name);
    setPhoneNumber(phone);
    // Save to localStorage
    localStorage.setItem("gymName", name);
    localStorage.setItem("gymPhone", phone);

    // Update the hero section text
    const heroTitle = document.querySelector("#gym-name-display");
    if (heroTitle) {
      heroTitle.textContent = name;
    }
  };



  return (
    <main>
      <Navbar gymName={gymName} phoneNumber={phoneNumber} />
      <Hero phoneNumber={phoneNumber} />
      <About />
      <Services />
      <Facilities />
      <Pricing />
      <FAQs />
      <Contact gymName={gymName} phoneNumber={phoneNumber} />
      <Footer gymName={gymName} />
      <StickyMobileCTA phoneNumber={phoneNumber} />
      <NameUpdateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdateName={(name, phone) => handleUpdateName(name, phone)}
      />
    </main>
  );
}
