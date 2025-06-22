'use server';

import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  message: z.string().min(10, "Message must be at least 10 characters."),
});

type State = {
  success?: boolean;
  message?: string;
};

export async function submitContactForm(prevState: State | null, formData: FormData): Promise<State> {
  const validatedFields = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    // The client-side validation should catch this, but this is a safeguard.
    return {
      success: false,
      message: 'Invalid form data. Please check your entries.',
    };
  }
  
  // Here you would typically send an email, save to a database, or call another service.
  // For this example, we'll just log it to the server console.
  console.log('New contact form submission:');
  console.log('Name:', validatedFields.data.name);
  console.log('Email:', validatedFields.data.email);
  console.log('Message:', validatedFields.data.message);

  return {
    success: true,
    message: 'Thank you for your message! We will get back to you soon.',
  };
}
