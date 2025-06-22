import ContactForm from './contact-form';

export default function Contact() {
  return (
    <section id="contact" className="h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">Ready to Find Your Place?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Contact us for a personalized tour or to learn more about how we can help you find your new home. Fill out the form, and we'll be in touch shortly.
            </p>
            <div className="mt-8 space-y-4 text-muted-foreground">
              <p><strong>Email:</strong> sales@yourplace.com</p>
              <p><strong>Phone:</strong> (555) 123-4567</p>
              <p><strong>Address:</strong> 123 Modern Avenue, Metropolis</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
