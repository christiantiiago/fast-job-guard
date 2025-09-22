import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function Chat() {
  const navigate = useNavigate();
  const { job_id } = useParams();

  useEffect(() => {
    // Se há job_id na URL, redirecionar para a rota completa
    if (job_id) {
      navigate(`/chats/${job_id}`, { replace: true });
    } else {
      // Se não há job_id, redirecionar para lista de chats
      navigate('/chats', { replace: true });
    }
  }, [job_id, navigate]);

  return null; // Não renderiza nada, apenas redireciona
}