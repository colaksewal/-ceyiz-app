package com.ceyiz.app.service;

import com.ceyiz.app.TooManyRequestsException;
import com.ceyiz.app.dto.AiJobResponse;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/**
 * AI isteklerini arka planda, sırayla çalıştırır. CPU'lu sunucuda görselli bir istek ~1 dk
 * sürüyor; HTTP isteği bu süre boyunca açık beklemek yerine iş kimliği hemen döner, frontend
 * durumu ara ara sorar ve kullanıcı bu arada uygulamada gezinebilir.
 *
 * Tek iş parçacığı bilinçli: Ollama aynı 4 çekirdeği kullandığı için iki isteği aynı anda
 * çalıştırmak ikisini de yavaşlatır; sırayla gitmek ilk geleni daha erken bitirir.
 *
 * İşler bellekte tutulur (DB yok): backend yeniden başlarsa yarım işler kaybolur, frontend
 * bunu 404'ten anlayıp "tekrar dene" der. Biten işler bir süre sonra temizlenir.
 */
@Slf4j
@Service
public class AiJobService {

    private static final int MAX_ACTIVE_JOBS_PER_USER = 2;
    private static final int MAX_ACTIVE_JOBS_TOTAL = 20;
    private static final Duration FINISHED_JOB_TTL = Duration.ofMinutes(30);

    private enum Status { PENDING, RUNNING, DONE, EMPTY, FAILED }

    private static final class Job {
        final UUID id = UUID.randomUUID();
        final UUID ownerId;
        final long sequence;
        volatile Status status = Status.PENDING;
        volatile Object result;
        volatile String error;
        volatile Instant finishedAt;

        Job(UUID ownerId, long sequence) {
            this.ownerId = ownerId;
            this.sequence = sequence;
        }

        boolean isActive() {
            return status == Status.PENDING || status == Status.RUNNING;
        }
    }

    private final Map<UUID, Job> jobs = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();
    private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "ai-job");
        thread.setDaemon(true);
        return thread;
    });

    /** Boş Optional = AI bir şey çıkaramadı (EMPTY); istisna = hata (FAILED). */
    public synchronized UUID submit(UUID ownerId, Supplier<? extends Optional<?>> work) {
        removeExpiredJobs();

        long activeTotal = jobs.values().stream().filter(Job::isActive).count();
        long activeForUser = jobs.values().stream()
                .filter(job -> job.isActive() && job.ownerId.equals(ownerId))
                .count();
        if (activeForUser >= MAX_ACTIVE_JOBS_PER_USER) {
            throw new TooManyRequestsException("Önceki AI isteklerin bitmeden yenisini başlatamazsın");
        }
        if (activeTotal >= MAX_ACTIVE_JOBS_TOTAL) {
            throw new TooManyRequestsException("AI şu an çok yoğun, biraz sonra tekrar dene");
        }

        Job job = new Job(ownerId, sequence.incrementAndGet());
        jobs.put(job.id, job);
        executor.submit(() -> run(job, work));
        return job.id;
    }

    public AiJobResponse get(UUID ownerId, UUID jobId) {
        Job job = jobs.get(jobId);
        // Başkasının işi de "bulunamadı" sayılır; varlığı bile sızmasın.
        if (job == null || !job.ownerId.equals(ownerId)) {
            throw new IllegalArgumentException("AI isteği bulunamadı");
        }
        return new AiJobResponse(job.id, job.status.name(), queuePosition(job), job.result, job.error);
    }

    // İşler tek tek çalıştığı için bu satırdan sonraki "[AI]" satırları (girdi, cevap) bu işe aittir.
    private void run(Job job, Supplier<? extends Optional<?>> work) {
        job.status = Status.RUNNING;
        log.info("[AI] iş başladı: job={} kullanıcı={}", job.id, job.ownerId);
        try {
            Optional<?> result = work.get();
            job.result = result.orElse(null);
            job.status = result.isPresent() ? Status.DONE : Status.EMPTY;
        } catch (IllegalArgumentException e) {
            job.error = e.getMessage();
            job.status = Status.FAILED;
        } catch (Exception e) {
            log.error("AI işi başarısız: {}", job.id, e);
            job.error = "Öneri alınamadı, tekrar dene";
            job.status = Status.FAILED;
        } finally {
            job.finishedAt = Instant.now();
        }
    }

    private int queuePosition(Job job) {
        if (job.status != Status.PENDING) return 0;
        return (int) jobs.values().stream()
                .filter(other -> other.isActive() && other.sequence < job.sequence)
                .count();
    }

    private void removeExpiredJobs() {
        Instant cutoff = Instant.now().minus(FINISHED_JOB_TTL);
        jobs.values().removeIf(job -> job.finishedAt != null && job.finishedAt.isBefore(cutoff));
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
