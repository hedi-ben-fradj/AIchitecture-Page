import ContactForm from './contact-form';

export default function Contact() {
  return (
    <section id="contact" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-bold">Ready to Transform Your Listings?</h2>
            <p className="mt-4 text-lg text-foreground/70">
              Contact us for a personalized demo or to learn more about how AIchitect Viewer can help you sell properties faster. Fill out the form, and we'll be in touch shortly.
            </p>
            <div className="mt-8 space-y-4 text-foreground/80">
              <p><strong>Email:</strong> sales@aichitect.com</p>
              <p><strong>Phone:</strong> (555) 123-4567</p>
              <p><strong>Address:</strong> 123 Tech Avenue, Silicon Valley, CA</p>
            </div>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
