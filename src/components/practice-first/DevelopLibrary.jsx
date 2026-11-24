/**
 * DevelopLibrary — the Develop chapter of the combined Practice First page: the
 * journey feature card, then the courses and experiences shelves, then the
 * certificates and learning record records.
 */
import React from "react";
import { Plus, Layers, Star } from "lucide-react";
import JourneyCarousel from "@/components/journey-home/JourneyCarousel";
import LearningShelf from "@/components/learning/LearningShelf";
import ShelfCarousel from "@/components/journey-home/ShelfCarousel";
import ExperienceShelfCard from "@/components/development/ExperienceShelfCard";
import CertificateViewer from "@/components/learning/CertificateViewer";
import MyLearningRecord from "@/components/learning/MyLearningRecord";
import AchievementsStrip from "@/components/journey-home/AchievementsStrip";
import DevelopRecord from "./DevelopRecord";

const FEATURE_IMAGE =
  "https://media.base44.com/images/public/69d4650b54be3dc79a1fd0b9/b4ccf62cd00fb9f4f04a973bb122e346_generated_b58d3182.jpg";

function LinkButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold text-[#3B7890] transition-colors duration-200 hover:text-[#E1A45E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B7890]"
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#3B7890] bg-[#3B7890] px-3.5 py-2 text-xs font-bold text-white transition-[background,box-shadow] duration-200 hover:bg-[#2f6379] active:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B7890]"
    >
      {children}
    </button>
  );
}

function RowHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-bold leading-[1.3] tracking-[-0.014em] text-[#172832]">{title}</h2>
        <p className="mt-1 text-[13px] text-[#5c707c]">{subtitle}</p>
      </div>
      {actions && <div className="flex items-center gap-3.5">{actions}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="pf-white rounded-2xl border-[1.5px] border-dashed border-[#b7c5ce] px-6 py-7 text-center">
      <Icon className="mx-auto mb-2 h-[34px] w-[34px] text-[#3B7890] opacity-55" />
      <b className="block text-[15px] text-[#172832]">{title}</b>
      {text && (
        <span className="mx-auto mt-1 block max-w-[420px] text-[13px] leading-[1.5] text-[#5c707c]">{text}</span>
      )}
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2].map((key) => (
        <div key={key} className="pf-white h-56 w-[280px] flex-shrink-0 animate-pulse rounded-2xl border border-[#cfd8de]" />
      ))}
    </div>
  );
}

export default function DevelopLibrary({
  journeyItems,
  learningItems,
  showCompletedLearning,
  onToggleCompletedLearning,
  experiences,
  showCompletedExperiences,
  onToggleCompletedExperiences,
  loading,
  loadingExperiences,
  email,
  onOpenJourney,
  onEditJourney,
  onDeleteJourney,
  canManageJourney,
  onNewJourney,
  onLearningChanged,
  onLogExperience,
  onEditExperience,
  onDeleteExperience,
  onAdoptExperience,
}) {
  const feature = journeyItems[0] || null;

  return (
    <section className="rounded-3xl border border-[#cfd8de] bg-[#f6f9fb] p-5 sm:p-[30px]">
      {/* Chapter header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#3B7890]">
          <Layers className="h-3.5 w-3.5" />
          My development
        </span>
        <PrimaryButton onClick={onNewJourney}>
          <Plus className="h-3.5 w-3.5" /> New journey
        </PrimaryButton>
      </div>

      {/* Journey feature */}
      <div className="relative mt-4 min-h-[200px] overflow-hidden rounded-[20px] bg-[#172832] text-[#E9EEF2] shadow-[0_12px_28px_rgba(23,40,50,0.2)]">
        <img src={FEATURE_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(23,40,50,0.94)] to-[rgba(23,40,50,0.55)]" />

        {feature ? (
          <button
            type="button"
            onClick={() => onOpenJourney(feature)}
            className="relative flex w-full max-w-[540px] flex-col gap-2 p-7 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E1A45E]"
          >
            <h3 className="text-[22px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[#E9EEF2]">
              {feature.title}
            </h3>
            <p className="text-[13px] leading-[1.5] text-[#E9EEF2]/80">
              {feature.subtitle || feature.meta || "Continue where you left off."}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E9EEF2]/20">
                <span
                  className="block h-full rounded-full bg-[#E1A45E]"
                  style={{ width: `${Math.min(100, Math.round(feature.percent || 0))}%` }}
                />
              </span>
              <span className="text-xs font-bold text-[#E9EEF2]">
                {Math.round(feature.percent || 0)}%
              </span>
            </div>
            {feature.meta && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#E1A45E]">{feature.meta}</p>
            )}
          </button>
        ) : (
          <div className="relative flex max-w-[540px] flex-col gap-2 p-7">
            <h3 className="text-[22px] font-extrabold leading-[1.3] tracking-[-0.015em] text-[#E9EEF2]">
              No journeys yet
            </h3>
            <p className="text-[13px] leading-[1.5] text-[#E9EEF2]/80">
              Journeys combine coaching, projects and learning into one path. Create one, or wait for your
              program team to assign one.
            </p>
          </div>
        )}
      </div>

      {/* Journeys */}
      <div className="mt-6">
        <RowHeader
          title="My Journeys"
          subtitle="Multi-step development paths — resume where you left off."
        />
        {loading ? (
          <SkeletonRow />
        ) : journeyItems.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No journeys yet"
            text="Journeys combine coaching, projects and learning into one path."
          />
        ) : (
          <JourneyCarousel
            items={journeyItems}
            onOpen={onOpenJourney}
            onEdit={onEditJourney}
            onDelete={onDeleteJourney}
            canManage={canManageJourney}
          />
        )}
      </div>

      {/* Courses & learning */}
      <div className="mt-6">
        <RowHeader
          title="My Courses & Learning"
          subtitle="Assigned courses, resources and conversations."
          actions={
            <LinkButton onClick={onToggleCompletedLearning}>
              {showCompletedLearning ? "Show active" : "Show completed"}
            </LinkButton>
          }
        />
        <LearningShelf items={learningItems} loading={loading} onChanged={onLearningChanged} />
      </div>

      {/* Experiences */}
      <div className="mt-6">
        <RowHeader
          title="My Experiences"
          subtitle="Coaching, stretch projects, mentorship and more."
          actions={
            <>
              <LinkButton onClick={onToggleCompletedExperiences}>
                {showCompletedExperiences ? "Show active" : "Show completed"}
              </LinkButton>
              <PrimaryButton onClick={onLogExperience}>
                <Plus className="h-3.5 w-3.5" /> Log experience
              </PrimaryButton>
            </>
          }
        />
        {loadingExperiences ? (
          <SkeletonRow />
        ) : experiences.length === 0 ? (
          <EmptyState
            icon={Star}
            title={showCompletedExperiences ? "No completed experiences yet" : "No active experiences"}
            text="Log coaching, stretch projects, mentorship and more."
            action={
              !showCompletedExperiences ? (
                <PrimaryButton onClick={onLogExperience}>Log experience</PrimaryButton>
              ) : null
            }
          />
        ) : (
          <ShelfCarousel
            items={experiences}
            renderItem={(exp) => (
              <ExperienceShelfCard
                exp={exp}
                onEdit={() => onEditExperience(exp)}
                onDelete={() => onDeleteExperience(exp)}
                onAdopt={onAdoptExperience}
              />
            )}
          />
        )}
      </div>

      {/* Records */}
      <div className="mt-6">
        <AchievementsStrip />
        <div className="mt-4 flex flex-col gap-2.5">
          <DevelopRecord title="My certificates">
            <CertificateViewer />
          </DevelopRecord>
          <DevelopRecord title="My learning record">
            <MyLearningRecord email={email} />
          </DevelopRecord>
        </div>
      </div>
    </section>
  );
}