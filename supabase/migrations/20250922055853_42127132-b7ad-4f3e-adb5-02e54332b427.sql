-- Add signature fields to contracts table
ALTER TABLE public.contracts 
ADD COLUMN client_signature_data TEXT,
ADD COLUMN provider_signature_data TEXT,
ADD COLUMN contract_pdf_url TEXT,
ADD COLUMN client_signature_ip INET,
ADD COLUMN provider_signature_ip INET,
ADD COLUMN client_signature_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN provider_signature_timestamp TIMESTAMP WITH TIME ZONE;

-- Add support for file attachments in job messages
ALTER TABLE public.job_messages
ADD COLUMN has_attachments BOOLEAN DEFAULT FALSE;